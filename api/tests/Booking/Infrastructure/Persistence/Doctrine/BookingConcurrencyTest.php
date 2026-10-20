<?php

declare(strict_types=1);

namespace App\Tests\Booking\Infrastructure\Persistence\Doctrine;

use App\Booking\Application\Availability\AvailabilityCalculator;
use App\Booking\Application\CreateBooking\CreateBookingCommand;
use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Domain\Booking;
use App\Booking\Infrastructure\Persistence\Doctrine\DoctrineBookingRepository;
use App\Service\Domain\Service;
use App\Service\Infrastructure\Persistence\Doctrine\DoctrineServiceRepository;
use App\User\Domain\User;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Tools\DsnParser;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\Mapping\UnderscoreNamingStrategy;
use Doctrine\ORM\ORMSetup;
use Doctrine\ORM\Tools\SchemaTool;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group('postgresql')]
final class BookingConcurrencyTest extends TestCase
{
    private ?EntityManager $entityManager = null;
    private ?string $schema = null;
    private string $databaseUrl;
    private User $client;
    private Service $firstService;
    private Service $sameProviderService;
    private Service $otherProviderService;
    private string $day;
    private $worker = null;
    private array $pipes = [];

    protected function setUp(): void
    {
        $databaseUrl = $_SERVER['BOOKING_DATABASE_URL'] ?? $_ENV['BOOKING_DATABASE_URL'] ?? getenv('BOOKING_DATABASE_URL');
        if ($databaseUrl === false || $databaseUrl === '') {
            self::markTestSkipped('Set BOOKING_DATABASE_URL to a temporary PostgreSQL database.');
        }
        $this->databaseUrl = $databaseUrl;
        $parameters = (new DsnParser(['postgresql' => 'pdo_pgsql']))->parse($databaseUrl);
        self::assertSame('booking_platform_migration_test', $parameters['dbname'] ?? null);
        $connection = DriverManager::getConnection($parameters);
        self::assertInstanceOf(PostgreSQLPlatform::class, $connection->getDatabasePlatform());
        $configuration = ORMSetup::createAttributeMetadataConfig([
            dirname(__DIR__, 5) . '/src/Booking/Domain',
            dirname(__DIR__, 5) . '/src/Service/Domain',
            dirname(__DIR__, 5) . '/src/User/Domain',
        ], true);
        $configuration->enableNativeLazyObjects(true);
        $configuration->setNamingStrategy(new UnderscoreNamingStrategy());
        $this->entityManager = new EntityManager($connection, $configuration);
        $this->schema = 'booking_concurrency_' . bin2hex(random_bytes(8));
        $connection->executeStatement('CREATE SCHEMA ' . $this->schema);
        $connection->executeStatement('SET search_path TO ' . $this->schema);
        (new SchemaTool($this->entityManager))->createSchema($this->entityManager->getMetadataFactory()->getAllMetadata());

        $this->client = new User('client@example.com', 'hash', [User::ROLE_CLIENT]);
        $firstProvider = new User('first-provider@example.com', 'hash', [User::ROLE_PROVIDER]);
        $otherProvider = new User('other-provider@example.com', 'hash', [User::ROLE_PROVIDER]);
        $this->firstService = new Service('First', null, '100.00', 60, $firstProvider);
        $this->sameProviderService = new Service('Same provider', null, '100.00', 120, $firstProvider);
        $this->otherProviderService = new Service('Other provider', null, '100.00', 60, $otherProvider);
        foreach ([$this->client, $firstProvider, $otherProvider, $this->firstService, $this->sameProviderService, $this->otherProviderService] as $entity) {
            $this->entityManager->persist($entity);
        }
        $this->entityManager->flush();
        $this->day = (new \DateTimeImmutable('next monday +2 weeks', new \DateTimeZone('Europe/Warsaw')))->format('Y-m-d');
    }

    protected function tearDown(): void
    {
        if (is_resource($this->worker)) {
            if (proc_get_status($this->worker)['running']) {
                proc_terminate($this->worker);
            }
            foreach ($this->pipes as $pipe) {
                fclose($pipe);
            }
            proc_close($this->worker);
        }
        if ($this->entityManager !== null) {
            $connection = $this->entityManager->getConnection();
            while ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            if ($this->schema !== null) {
                $connection->executeStatement('DROP SCHEMA ' . $this->schema . ' CASCADE');
            }
            $connection->close();
        }
        parent::tearDown();
    }

    #[DataProvider('sameProviderRequests')]
    public function testSameProviderRequestsWaitAndRecheckConflicts(bool $differentService, string $time, int $expectedStatus, bool $commitFirst = true): void
    {
        $connection = $this->entityManager->getConnection();
        $connection->beginTransaction();
        $this->createBooking($this->firstService, '10:00');
        $workerPid = $this->startWorker($differentService ? $this->sameProviderService : $this->firstService, $time);
        $parentPid = (int) $connection->fetchOne('SELECT pg_backend_pid()');
        $deadline = microtime(true) + 5;
        $blocked = false;
        do {
            $blocked = (bool) $connection->fetchOne(
                "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid = ? AND wait_event_type = 'Lock' AND ? = ANY(pg_blocking_pids(pid)))",
                [$workerPid, $parentPid]
            );
            if (!$blocked) {
                usleep(10000);
            }
        } while (!$blocked && microtime(true) < $deadline);

        self::assertTrue($blocked, 'The second request must wait for the provider lock held by the first request.');
        if ($commitFirst) {
            $connection->commit();
        } else {
            $connection->rollBack();
        }
        $result = $this->readWorkerMessage();

        self::assertSame($expectedStatus, $result['status'], json_encode($result));
        self::assertSame($expectedStatus === 409 || !$commitFirst ? 1 : 2, (int) $connection->fetchOne('SELECT COUNT(*) FROM bookings'));
    }

    public static function sameProviderRequests(): array
    {
        return [
            'same service and start' => [false, '10:00', 409],
            'different services with partial overlap' => [true, '10:30', 409],
            'new interval contains existing interval' => [true, '09:30', 409],
            'touching before' => [false, '09:00', 201],
            'touching after' => [true, '11:00', 201],
            'rollback releases the calendar' => [false, '10:00', 201, false],
        ];
    }

    public function testDifferentProvidersCanCommitWhileTheFirstRequestIsUncommitted(): void
    {
        $connection = $this->entityManager->getConnection();
        $connection->beginTransaction();
        $this->createBooking($this->firstService, '10:00');
        $this->startWorker($this->otherProviderService, '10:00');

        $result = $this->readWorkerMessage();
        self::assertSame(201, $result['status'], json_encode($result));
        self::assertTrue($connection->isTransactionActive());
        $connection->commit();
        self::assertSame(2, (int) $connection->fetchOne('SELECT COUNT(*) FROM bookings'));
    }

    public function testPostgresAvailabilityIncludesInactiveAndOvernightBookingsOnlyForTheirProvider(): void
    {
        $longService = new Service('Historical overnight service', null, '100.00', 18 * 60, $this->firstService->getProvider());
        $longService->deactivate();
        $this->entityManager->persist($longService);
        $this->entityManager->persist(new Booking(
            $longService, $this->client, 'Customer', 'customer@example.com',
            (new \DateTimeImmutable($this->day, new \DateTimeZone('Europe/Warsaw')))->modify('-1 day')->setTime(16, 0)
        ));
        $this->entityManager->flush();
        $this->entityManager->clear();
        $bookings = new DoctrineBookingRepository($this->entityManager);
        $services = new DoctrineServiceRepository($this->entityManager);
        $calculator = new AvailabilityCalculator($bookings, $services);
        $date = new \DateTimeImmutable($this->day, new \DateTimeZone('Europe/Warsaw'));

        $slots = $calculator->calculateForDay($this->firstService->getId(), $date);
        self::assertNotContains('09:00', $slots);
        self::assertNotContains('09:45', $slots);
        self::assertContains('10:00', $slots);
        self::assertContains('09:00', $calculator->calculateForDay($this->otherProviderService->getId(), $date));
    }

    public function testServiceIsRevalidatedInsideTheTransaction(): void
    {
        $this->entityManager->getConnection()->executeStatement('UPDATE services SET is_active = false WHERE id = ?', [$this->firstService->getId()]);
        $booking = new Booking($this->firstService, $this->client, 'Customer', 'customer@example.com', new \DateTimeImmutable($this->day . ' 10:00:00', new \DateTimeZone('Europe/Warsaw')));

        try {
            (new DoctrineBookingRepository($this->entityManager))->save($booking);
            self::fail('The stale active service must be reloaded before saving.');
        } catch (\InvalidArgumentException) {
            self::assertSame(0, (int) $this->entityManager->getConnection()->fetchOne('SELECT COUNT(*) FROM bookings'));
            self::assertFalse($this->entityManager->getConnection()->isTransactionActive());
        }
    }

    private function createBooking(Service $service, string $time): void
    {
        $handler = new CreateBookingHandler(new DoctrineBookingRepository($this->entityManager), new DoctrineServiceRepository($this->entityManager));
        $handler->handle(new CreateBookingCommand($service->getId(), 'Customer', 'customer@example.com', $this->day . 'T' . $time . ':00'), $this->client);
    }

    private function startWorker(Service $service, string $time): int
    {
        $this->worker = proc_open([
            PHP_BINARY, __DIR__ . '/booking_worker.php', $this->schema,
            (string) $service->getId(), (string) $this->client->getId(), $this->day . 'T' . $time . ':00',
        ], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $this->pipes);
        self::assertIsResource($this->worker);

        if (fwrite($this->pipes[0], $this->databaseUrl) !== strlen($this->databaseUrl)) {
            throw new \RuntimeException('Could not send database configuration to the worker.');
        }
        fclose($this->pipes[0]);
        unset($this->pipes[0]);

        return (int) $this->readWorkerMessage()['pid'];
    }

    private function readWorkerMessage(): array
    {
        $read = [$this->pipes[1]];
        $write = $except = [];
        self::assertSame(1, stream_select($read, $write, $except, 12), 'Timed out waiting for the concurrent request.');
        $line = fgets($this->pipes[1]);
        if ($line === false) {
            self::fail('The concurrent request failed: ' . stream_get_contents($this->pipes[2]));
        }

        return json_decode($line, true, 512, JSON_THROW_ON_ERROR);
    }
}
