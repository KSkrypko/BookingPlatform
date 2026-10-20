<?php

declare(strict_types=1);

namespace App\Tests\Booking\Application\CreateBooking;

use App\Booking\Application\CreateBooking\CreateBookingCommand;
use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use App\User\Domain\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CreateBookingHandlerTest extends TestCase
{
    private Service $service;
    private User $client;
    private ServiceRepositoryInterface $serviceRepository;

    protected function setUp(): void
    {
        $this->service = new Service('Consultation', null, '100.00', 60, new User('provider@example.com', 'hash', [User::ROLE_PROVIDER]));
        (new \ReflectionProperty(Service::class, 'id'))->setValue($this->service, 1);
        $this->client = new User('client@example.com', 'hash', [User::ROLE_CLIENT]);
        $this->serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $this->serviceRepository->method('findActiveById')->willReturn($this->service);
    }

    public function testCreatesBookingAndReturnsWarsawLocalizedView(): void
    {
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository
            ->expects($this->once())
            ->method('save')
            ->with($this->callback(
                fn (Booking $booking): bool => $booking->getService() === $this->service
                    && $booking->getClient() === $this->client
            ));

        $handler = new CreateBookingHandler($bookingRepository, $this->serviceRepository);

        $command = new CreateBookingCommand(
            serviceId: 1,
            customerName: 'Jane Doe',
            customerEmail: 'jane@example.com',
            bookingDate: $this->futureDate()
        );

        $view = $handler->handle($command, $this->client);

        $this->assertSame(1, $view->serviceId);
        $this->assertSame('Jane Doe', $view->customerName);
        $this->assertSame('jane@example.com', $view->customerEmail);
        $this->assertStringStartsWith($this->futureDate(), $view->bookingDate);
        $this->assertMatchesRegularExpression('/\+0[12]:00$/', $view->bookingDate);
    }

    public function testThrowsForInvalidCustomerEmail(): void
    {
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository->expects($this->never())->method('save');

        $handler = new CreateBookingHandler($bookingRepository, $this->serviceRepository);

        $command = new CreateBookingCommand(
            serviceId: 1,
            customerName: 'Jane Doe',
            customerEmail: 'not-an-email',
            bookingDate: $this->futureDate()
        );

        $this->expectException(\InvalidArgumentException::class);

        $handler->handle($command, $this->client);
    }

    public function testRejectsMissingOrInactiveService(): void
    {
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository->expects($this->never())->method('save');
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturn(null);
        $handler = new CreateBookingHandler($bookingRepository, $serviceRepository);

        $this->expectException(\InvalidArgumentException::class);

        $handler->handle(
            new CreateBookingCommand(999, 'Jane Doe', 'jane@example.com', $this->futureDate()),
            $this->client
        );
    }

    #[DataProvider('invalidDates')]
    public function testRejectsInvalidBookingDates(string $date): void
    {
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository->expects($this->never())->method('save');
        $handler = new CreateBookingHandler($bookingRepository, $this->serviceRepository);

        $this->expectException(\InvalidArgumentException::class);

        $handler->handle(new CreateBookingCommand(1, 'Jane Doe', 'jane@example.com', $date), $this->client);
    }

    public static function invalidDates(): array
    {
        return [
            'empty' => [''],
            'relative' => ['tomorrow'],
            'invalid day' => ['2099-02-30T10:00:00'],
            'invalid leap day' => ['2099-02-29T10:00:00'],
            'invalid hour' => ['2099-01-05T25:00:00'],
            'date only' => ['2099-01-05'],
            'space separator' => ['2099-01-05 10:00:00'],
            'UTC' => ['2099-01-05T10:00:00Z'],
            'offset' => ['2099-01-05T10:00:00+01:00'],
            'fraction' => ['2099-01-05T10:00:00.000'],
            'trailing newline' => ["2099-01-05T10:00:00\n"],
            'past' => ['2000-01-03T10:00:00'],
            'before opening' => ['2099-01-05T08:45:00'],
            'ends after closing' => ['2099-01-05T16:15:00'],
            'off grid' => ['2099-01-05T10:07:00'],
            'seconds' => ['2099-01-05T10:00:01'],
            'Sunday' => ['2099-01-04T10:00:00'],
        ];
    }

    public function testRejectsUnownedService(): void
    {
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturn(new Service('Historical', null, '100.00', 60));
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository->expects($this->never())->method('save');

        $this->expectException(\InvalidArgumentException::class);

        (new CreateBookingHandler($bookingRepository, $serviceRepository))->handle(
            new CreateBookingCommand(1, 'Jane Doe', 'jane@example.com', $this->futureDate()),
            $this->client
        );
    }

    public function testRejectsEarlierTimeToday(): void
    {
        $date = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw'));
        $date = $date->setTime((int) $date->format('H'), intdiv((int) $date->format('i'), 15) * 15);
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository->expects($this->never())->method('save');

        $this->expectException(\InvalidArgumentException::class);

        (new CreateBookingHandler($bookingRepository, $this->serviceRepository))->handle(
            new CreateBookingCommand(1, 'Jane Doe', 'jane@example.com', $date->format('Y-m-d\TH:i:s')),
            $this->client
        );
    }

    #[DataProvider('validDates')]
    public function testAcceptsSaturdayAndLeapDay(string $date): void
    {
        $bookings = $this->createMock(BookingRepositoryInterface::class);
        $bookings->expects($this->once())->method('save');

        $view = (new CreateBookingHandler($bookings, $this->serviceRepository))->handle(
            new CreateBookingCommand(1, 'Jane Doe', 'jane@example.com', $date), $this->client
        );

        self::assertSame($date . '+01:00', $view->bookingDate);
    }

    public static function validDates(): array
    {
        return [
            'Saturday' => ['2099-01-03T09:00:00'],
            'leap day' => ['2096-02-29T09:00:00'],
        ];
    }

    private function futureDate(): string
    {
        return (new \DateTimeImmutable('next monday +2 weeks', new \DateTimeZone('Europe/Warsaw')))
            ->setTime(10, 0)->format('Y-m-d\TH:i:s');
    }

}
