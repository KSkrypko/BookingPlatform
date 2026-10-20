<?php

declare(strict_types=1);

namespace App\Tests\Booking\UI\Http;

use App\Booking\Application\Availability\AvailabilityCalculator;
use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use App\User\Domain\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class BookingAccessTest extends WebTestCase
{
    private KernelBrowser $browser;
    private EntityManagerInterface $entityManager;
    private User $firstClient;
    private User $secondClient;
    private User $firstProvider;
    private User $secondProvider;
    private Service $firstService;
    private Service $secondService;
    private Booking $firstBooking;
    private Booking $secondBooking;
    private Booking $thirdBooking;

    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);

        if ($key === false || !openssl_pkey_export($key, $privateKey)) {
            throw new \RuntimeException('Could not generate JWT test keys.');
        }

        $details = openssl_pkey_get_details($key);

        if ($details === false) {
            throw new \RuntimeException('Could not read the JWT public test key.');
        }

        $_ENV['JWT_SECRET_KEY'] = $_SERVER['JWT_SECRET_KEY'] = $privateKey;
        $_ENV['JWT_PUBLIC_KEY'] = $_SERVER['JWT_PUBLIC_KEY'] = $details['key'];
        $_ENV['JWT_PASSPHRASE'] = $_SERVER['JWT_PASSPHRASE'] = '';
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->browser = self::createClient();
        $this->browser->disableReboot();
        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);

        $connection = $this->entityManager->getConnection();

        if (($connection->getParams()['memory'] ?? false) !== true) {
            throw new \RuntimeException('Booking access tests require an in-memory database.');
        }

        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();
        (new SchemaTool($this->entityManager))->createSchema($metadata);

        $this->firstClient = new User('first-client@example.com', 'hash', [User::ROLE_CLIENT]);
        $this->secondClient = new User('second-client@example.com', 'hash', [User::ROLE_CLIENT]);
        $this->firstProvider = new User('first-provider@example.com', 'hash', [User::ROLE_PROVIDER]);
        $this->secondProvider = new User('second-provider@example.com', 'hash', [User::ROLE_PROVIDER]);
        $this->firstService = new Service('First service', null, '100.00', 60, $this->firstProvider);
        $this->secondService = new Service('Second service', null, '150.00', 45, $this->secondProvider);
        $date = new \DateTimeImmutable('2030-01-07 10:00:00', new \DateTimeZone('Europe/Warsaw'));

        $this->firstBooking = new Booking(
            $this->firstService,
            $this->firstClient,
            'First customer',
            $this->secondClient->getEmail(),
            $date
        );
        $this->secondBooking = new Booking(
            $this->firstService,
            $this->secondClient,
            'Second customer',
            $this->firstClient->getEmail(),
            $date->modify('+1 day')
        );
        $this->thirdBooking = new Booking(
            $this->secondService,
            $this->secondClient,
            'Third customer',
            $this->firstClient->getEmail(),
            $date->modify('+2 days')
        );

        foreach ([
            $this->firstClient,
            $this->secondClient,
            $this->firstProvider,
            $this->secondProvider,
            $this->firstService,
            $this->secondService,
            $this->firstBooking,
            $this->secondBooking,
            $this->thirdBooking,
        ] as $entity) {
            $this->entityManager->persist($entity);
        }

        $this->entityManager->flush();

        $connection->insert('bookings', [
            'service_id' => $this->firstService->getId(),
            'client_id' => null,
            'customer_name' => 'Historical customer',
            'customer_email' => $this->firstClient->getEmail(),
            'booking_date' => '2026-01-05 10:00:00',
            'created_at' => '2026-01-01 10:00:00',
        ]);
    }

    public function testAnonymousUserCannotReadBookings(): void
    {
        $this->browser->request('GET', '/api/bookings');

        self::assertResponseStatusCodeSame(401);
        self::assertStringNotContainsString('customerEmail', $this->browser->getResponse()->getContent());
    }

    public function testClientsCanReadOnlyTheirOwnBookingsRegardlessOfContactEmail(): void
    {
        $firstClientBookings = $this->getBookings($this->firstClient);
        self::assertSame([$this->firstBooking->getId()], array_column($firstClientBookings, 'id'));

        $secondClientBookings = $this->getBookings($this->secondClient);
        self::assertEqualsCanonicalizing(
            [$this->secondBooking->getId(), $this->thirdBooking->getId()],
            array_column($secondClientBookings, 'id')
        );
    }

    public function testProvidersCanReadOnlyBookingsForTheirServices(): void
    {
        $firstProviderBookings = $this->getBookings($this->firstProvider);
        self::assertEqualsCanonicalizing(
            [$this->firstBooking->getId(), $this->secondBooking->getId()],
            array_column($firstProviderBookings, 'id')
        );

        $secondProviderBookings = $this->getBookings($this->secondProvider);
        self::assertSame([$this->thirdBooking->getId()], array_column($secondProviderBookings, 'id'));
    }

    public function testProvidersCanStillReadBookingsForTheirInactiveServices(): void
    {
        $this->firstService->deactivate();
        $this->entityManager->flush();

        $bookings = $this->getBookings($this->firstProvider);

        self::assertEqualsCanonicalizing(
            [$this->firstBooking->getId(), $this->secondBooking->getId()],
            array_column($bookings, 'id')
        );
    }

    public function testInvalidTokenCannotReadBookings(): void
    {
        $this->browser->request('GET', '/api/bookings?clientId=' . $this->firstClient->getId(), server: [
            'HTTP_AUTHORIZATION' => 'Bearer invalid-token',
        ]);

        self::assertResponseStatusCodeSame(401);
        self::assertStringNotContainsString('customerEmail', $this->browser->getResponse()->getContent());
    }

    public function testRequestParametersCannotChangeTheBookingOwnerScope(): void
    {
        $query = '?' . http_build_query([
            'userId' => $this->secondClient->getId(),
            'clientId' => $this->secondClient->getId(),
            'providerId' => $this->secondProvider->getId(),
            'serviceId' => $this->secondService->getId(),
            'customerEmail' => $this->secondClient->getEmail(),
        ]);

        $clientBookings = $this->getBookings($this->firstClient, $query);
        self::assertSame([$this->firstBooking->getId()], array_column($clientBookings, 'id'));

        $providerBookings = $this->getBookings($this->firstProvider, $query);
        self::assertEqualsCanonicalizing(
            [$this->firstBooking->getId(), $this->secondBooking->getId()],
            array_column($providerBookings, 'id')
        );
    }

    public function testBookingOwnerComesFromTheAuthenticatedUser(): void
    {
        $token = self::getContainer()->get(JWTTokenManagerInterface::class)->create($this->firstClient);
        $this->browser->jsonRequest('POST', '/api/bookings', [
            'serviceId' => $this->secondService->getId(),
            'clientId' => $this->secondClient->getId(),
            'providerId' => $this->firstProvider->getId(),
            'customerName' => 'New customer',
            'customerEmail' => $this->secondClient->getEmail(),
            'bookingDate' => '2030-01-10T10:00:00',
        ], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        self::assertResponseStatusCodeSame(201);
        $response = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $booking = $this->entityManager->find(Booking::class, $response['id']);

        self::assertInstanceOf(Booking::class, $booking);
        self::assertSame($this->firstClient->getId(), $booking->getClient()?->getId());
        self::assertSame($this->secondService->getId(), $booking->getServiceId());
        self::assertSame($this->secondProvider->getId(), $booking->getService()->getProvider()?->getId());

        $secondClientBookings = $this->getBookings($this->secondClient);
        self::assertNotContains($response['id'], array_column($secondClientBookings, 'id'));
        $firstClientBookings = $this->getBookings($this->firstClient);
        self::assertContains($response['id'], array_column($firstClientBookings, 'id'));
    }

    public function testServiceOwnerComesFromTheAuthenticatedProvider(): void
    {
        $token = self::getContainer()->get(JWTTokenManagerInterface::class)->create($this->firstProvider);
        $this->browser->jsonRequest('POST', '/api/services', [
            'name' => 'New service',
            'description' => null,
            'price' => '120.00',
            'durationMinutes' => 30,
            'providerId' => $this->secondProvider->getId(),
        ], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        self::assertResponseStatusCodeSame(201);
        $response = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $service = $this->entityManager->find(Service::class, $response['id']);

        self::assertInstanceOf(Service::class, $service);
        self::assertSame($this->firstProvider->getId(), $service->getProvider()?->getId());
    }

    public function testUnownedServicesDoNotExposeBookingsToProviders(): void
    {
        $service = new Service('Historical service', null, '90.00', 30);
        $this->entityManager->persist($service);
        $this->entityManager->flush();
        $booking = new Booking(
            $service,
            $this->firstClient,
            'Customer',
            $this->firstClient->getEmail(),
            new \DateTimeImmutable('2030-01-11 10:00:00')
        );
        $this->entityManager->persist($booking);
        $this->entityManager->flush();

        foreach ([$this->firstProvider, $this->secondProvider] as $provider) {
            $bookings = $this->getBookings($provider);
            self::assertNotContains($booking->getId(), array_column($bookings, 'id'));
        }

        $bookings = $this->getBookings($this->firstClient);
        self::assertContains($booking->getId(), array_column($bookings, 'id'));
    }

    public function testPublicServicesExcludeUnownedAndInactiveServicesAndHaveAvailability(): void
    {
        $unowned = new Service('Historical service', null, '100.00', 60);
        $inactive = new Service('Inactive service', null, '100.00', 60, $this->firstProvider);
        $inactive->deactivate();
        $this->entityManager->persist($unowned);
        $this->entityManager->persist($inactive);
        $this->entityManager->flush();
        $this->entityManager->clear();

        $this->browser->request('GET', '/api/services');

        self::assertResponseStatusCodeSame(200);
        $services = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertEqualsCanonicalizing(
            [$this->firstService->getId(), $this->secondService->getId()],
            array_column($services, 'id')
        );

        foreach ($services as $service) {
            $this->browser->request('GET', '/api/availability', ['serviceId' => $service['id'], 'date' => '2030-01-10']);

            self::assertResponseStatusCodeSame(200);
            $availability = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            self::assertContains('10:00', $availability['slots']);
        }

        $this->browser->request('GET', '/api/availability', ['serviceId' => $unowned->getId(), 'date' => '2030-01-10']);
        self::assertResponseStatusCodeSame(400);
        self::assertSame(4, $this->entityManager->getConnection()->fetchOne('SELECT COUNT(*) FROM services'));
        $storedUnowned = $this->entityManager->find(Service::class, $unowned->getId());
        self::assertInstanceOf(Service::class, $storedUnowned);
        self::assertTrue($storedUnowned->isActive());
        self::assertNull($storedUnowned->getProvider());
    }

    public function testAvailabilityUsesIndependentProviderCalendars(): void
    {
        $date = $this->firstBooking->getBookingDate()->format('Y-m-d');
        $this->browser->request('GET', '/api/availability', ['serviceId' => $this->firstService->getId(), 'date' => $date]);
        self::assertResponseIsSuccessful();
        $slots = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['slots'];
        self::assertNotContains('10:00', $slots);
        self::assertContains('09:00', $slots);
        self::assertContains('11:00', $slots);

        $this->browser->request('GET', '/api/availability', ['serviceId' => $this->secondService->getId(), 'date' => $date]);
        self::assertResponseIsSuccessful();
        $slots = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['slots'];
        self::assertContains('10:00', $slots);
    }

    public function testInactiveServicesStillOccupyTheirFullDuration(): void
    {
        $otherService = new Service('Other service', null, '100.00', 30, $this->firstProvider);
        $this->firstService->deactivate();
        $this->entityManager->persist($otherService);
        $this->entityManager->flush();

        $this->browser->request('GET', '/api/availability', [
            'serviceId' => $otherService->getId(),
            'date' => $this->firstBooking->getBookingDate()->format('Y-m-d'),
        ]);

        self::assertResponseIsSuccessful();
        $slots = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['slots'];
        self::assertNotContains('10:15', $slots);
        self::assertNotContains('10:45', $slots);
        self::assertContains('09:30', $slots);
        self::assertContains('11:00', $slots);
    }

    public function testAvailabilityIncludesBookingsStartingBeforeTheDay(): void
    {
        $longService = new Service('Historical long service', null, '100.00', 18 * 60, $this->firstProvider);
        $this->entityManager->persist($longService);
        $this->entityManager->persist(new Booking(
            $longService,
            $this->firstClient,
            'Customer',
            'customer@example.com',
            $this->firstBooking->getBookingDate()->modify('-1 day')->setTime(16, 0)
        ));
        $this->entityManager->flush();

        $this->browser->request('GET', '/api/availability', [
            'serviceId' => $this->firstService->getId(),
            'date' => $this->firstBooking->getBookingDate()->format('Y-m-d'),
        ]);

        self::assertResponseIsSuccessful();
        $slots = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['slots'];
        self::assertNotContains('09:00', $slots);
        self::assertNotContains('09:45', $slots);
        self::assertContains('11:00', $slots);
    }

    public function testConflictsAcrossServicesReturn409AndTouchingBookingsAreAllowed(): void
    {
        $otherService = new Service('Other service', null, '100.00', 60, $this->firstProvider);
        $this->entityManager->persist($otherService);
        $this->entityManager->flush();

        foreach ([$this->firstService, $otherService] as $service) {
            $this->postBooking($service, '2030-01-07T10:30:00');
            self::assertResponseStatusCodeSame(409);
            self::assertSame(4, $this->entityManager->getConnection()->fetchOne('SELECT COUNT(*) FROM bookings'));
        }

        foreach (['09:00', '11:00', '16:00'] as $time) {
            $this->postBooking($otherService, '2030-01-07T' . $time . ':00');
            self::assertResponseStatusCodeSame(201);
        }

        $this->postBooking($this->secondService, '2030-01-07T10:00:00');
        self::assertResponseStatusCodeSame(201);
    }

    #[DataProvider('invalidDates')]
    public function testInvalidDatesReturn400WithoutSaving(string $date): void
    {
        $this->postBooking($this->firstService, $date);

        self::assertResponseStatusCodeSame(400);
        self::assertSame(4, $this->entityManager->getConnection()->fetchOne('SELECT COUNT(*) FROM bookings'));
    }

    public static function invalidDates(): array
    {
        return [
            [''], ['tomorrow'], ['2030-02-30T10:00:00'], ['2030-01-07T10:00:00Z'],
            ['2030-01-07T10:00:00+01:00'], ['2000-01-03T10:00:00'],
            ['2030-01-06T10:00:00'], ['2030-01-07T08:45:00'], ['2030-01-07T16:15:00'],
            ['2030-01-07T10:07:00'], ['2030-01-07T10:00:01'],
        ];
    }

    public function testInactiveAndUnownedServicesCannotBeBooked(): void
    {
        $unowned = new Service('Historical', null, '100.00', 60);
        $this->firstService->deactivate();
        $this->entityManager->persist($unowned);
        $this->entityManager->flush();

        foreach ([$this->firstService, $unowned] as $service) {
            $this->postBooking($service, '2030-01-10T10:00:00');
            self::assertResponseStatusCodeSame(400);
        }
        self::assertSame(4, $this->entityManager->getConnection()->fetchOne('SELECT COUNT(*) FROM bookings'));
    }

    public function testInvalidCalendarDateIsRejectedByAvailability(): void
    {
        $this->browser->request('GET', '/api/availability', ['serviceId' => $this->firstService->getId(), 'date' => '2030-02-30']);

        self::assertResponseStatusCodeSame(400);
    }

    public function testWarsawTimesSurviveReloadWithDifferentPhpTimezone(): void
    {
        $timezone = date_default_timezone_get();
        date_default_timezone_set('UTC');

        try {
            $year = (int) date('Y') + 1;
            foreach (['01' => '+01:00', '07' => '+02:00'] as $month => $offset) {
                $date = (new \DateTimeImmutable($year . '-' . $month . '-01', new \DateTimeZone('Europe/Warsaw')))
                    ->modify('first monday of this month')->format('Y-m-d');
                $this->postBooking($this->firstService, $date . 'T10:00:00');
                self::assertResponseStatusCodeSame(201);
                $response = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
                self::assertSame($date . 'T10:00:00' . $offset, $response['bookingDate']);
                $this->entityManager->clear();

                $this->browser->request('GET', '/api/availability', ['serviceId' => $this->firstService->getId(), 'date' => $date]);
                self::assertResponseIsSuccessful();
                $slots = json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR)['slots'];
                self::assertNotContains('10:00', $slots);
                self::assertContains('11:00', $slots);

                $bookings = $this->getBookings($this->firstClient);
                $created = array_values(array_filter($bookings, static fn (array $booking): bool => $booking['id'] === $response['id']));
                self::assertSame($date . 'T10:00:00' . $offset, $created[0]['bookingDate']);
            }
        } finally {
            date_default_timezone_set($timezone);
        }
    }

    public function testUnexpectedBookingErrorReturnsSafe500(): void
    {
        $services = $this->createStub(ServiceRepositoryInterface::class);
        $services->method('findActiveById')->willThrowException(new \RuntimeException('SQLSTATE private database details'));
        self::getContainer()->set(CreateBookingHandler::class, new CreateBookingHandler(
            $this->createStub(BookingRepositoryInterface::class), $services
        ));

        $this->postBooking($this->firstService, '2030-01-10T10:00:00');

        self::assertResponseStatusCodeSame(500);
        self::assertSame(['message' => 'Nie udało się utworzyć rezerwacji.'], json_decode($this->browser->getResponse()->getContent(), true));
    }

    public function testUnexpectedAvailabilityErrorReturnsSafe500(): void
    {
        $bookings = $this->createStub(BookingRepositoryInterface::class);
        $bookings->method('findOverlappingForProvider')->willThrowException(new \RuntimeException('SQLSTATE private database details'));
        $services = $this->createStub(ServiceRepositoryInterface::class);
        $services->method('findActiveById')->willReturn($this->firstService);
        self::getContainer()->set(AvailabilityCalculator::class, new AvailabilityCalculator($bookings, $services));

        $this->browser->request('GET', '/api/availability', ['serviceId' => $this->firstService->getId(), 'date' => '2030-01-10']);

        self::assertResponseStatusCodeSame(500);
        self::assertSame(['message' => 'Nie udało się pobrać dostępności.'], json_decode($this->browser->getResponse()->getContent(), true));
    }

    public function testOnlyClientsCanCreateBookings(): void
    {
        $payload = ['serviceId' => $this->firstService->getId(), 'customerName' => 'Customer', 'customerEmail' => 'customer@example.com', 'bookingDate' => '2030-01-10T10:00:00'];
        $this->browser->jsonRequest('POST', '/api/bookings', $payload);
        self::assertResponseStatusCodeSame(401);

        $token = self::getContainer()->get(JWTTokenManagerInterface::class)->create($this->firstProvider);
        $this->browser->jsonRequest('POST', '/api/bookings', $payload, ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);
        self::assertResponseStatusCodeSame(403);
    }

    private function postBooking(Service $service, string $date): void
    {
        $token = self::getContainer()->get(JWTTokenManagerInterface::class)->create($this->firstClient);
        $this->browser->jsonRequest('POST', '/api/bookings', [
            'serviceId' => $service->getId(),
            'customerName' => 'Customer',
            'customerEmail' => 'customer@example.com',
            'bookingDate' => $date,
        ], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);
    }

    private function getBookings(User $user, string $query = ''): array
    {
        $token = self::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
        $this->browser->request('GET', '/api/bookings' . $query, server: ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        self::assertResponseIsSuccessful();

        return json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
