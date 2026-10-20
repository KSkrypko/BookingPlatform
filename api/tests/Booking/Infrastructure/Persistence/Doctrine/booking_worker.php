<?php

declare(strict_types=1);

use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Infrastructure\Persistence\Doctrine\DoctrineBookingRepository;
use App\Booking\UI\Http\BookingController;
use App\Service\Infrastructure\Persistence\Doctrine\DoctrineServiceRepository;
use App\User\Domain\User;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Tools\DsnParser;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\Mapping\UnderscoreNamingStrategy;
use Doctrine\ORM\ORMSetup;
use Psr\Log\NullLogger;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

require dirname(__DIR__, 5) . '/vendor/autoload.php';

[$script, $schema, $serviceId, $clientId, $date] = $argv;
$databaseUrl = stream_get_contents(STDIN);
if ($databaseUrl === false || $databaseUrl === '') {
    throw new RuntimeException('Database configuration is required on stdin.');
}
$parameters = (new DsnParser(['postgresql' => 'pdo_pgsql']))->parse($databaseUrl);
if (($parameters['dbname'] ?? '') !== 'booking_platform_migration_test' || !preg_match('/^booking_concurrency_[a-f0-9]+\z/', $schema)) {
    throw new RuntimeException('A temporary booking test database and schema are required.');
}

date_default_timezone_set('UTC');
$connection = DriverManager::getConnection($parameters);
$connection->executeStatement('SET search_path TO ' . $schema);
$connection->executeStatement("SET statement_timeout = '10s'");
$configuration = ORMSetup::createAttributeMetadataConfig([
    dirname(__DIR__, 5) . '/src/Booking/Domain',
    dirname(__DIR__, 5) . '/src/Service/Domain',
    dirname(__DIR__, 5) . '/src/User/Domain',
], true);
$configuration->enableNativeLazyObjects(true);
$configuration->setNamingStrategy(new UnderscoreNamingStrategy());
$entityManager = new EntityManager($connection, $configuration);
$client = $entityManager->find(User::class, (int) $clientId);
$handler = new CreateBookingHandler(new DoctrineBookingRepository($entityManager), new DoctrineServiceRepository($entityManager));
$controller = new BookingController();
$controller->setContainer(new Container());

echo json_encode(['pid' => $connection->fetchOne('SELECT pg_backend_pid()')], JSON_THROW_ON_ERROR), PHP_EOL;
flush();

$response = $controller->create(Request::create('/api/bookings', 'POST', content: json_encode([
    'serviceId' => (int) $serviceId,
    'customerName' => 'Concurrent customer',
    'customerEmail' => 'customer@example.com',
    'bookingDate' => $date,
], JSON_THROW_ON_ERROR)), $handler, new NullLogger(), $client);

echo json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR)], JSON_THROW_ON_ERROR), PHP_EOL;
$connection->close();
