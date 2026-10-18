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
use PHPUnit\Framework\TestCase;

final class CreateBookingHandlerTest extends TestCase
{
    private Service $service;
    private User $client;
    private ServiceRepositoryInterface $serviceRepository;

    protected function setUp(): void
    {
        $this->service = new Service('Consultation', null, '100.00', 60);
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
            bookingDate: '2026-08-10 10:00:00'
        );

        $view = $handler->handle($command, $this->client);

        $this->assertSame(1, $view->serviceId);
        $this->assertSame('Jane Doe', $view->customerName);
        $this->assertSame('jane@example.com', $view->customerEmail);
        $this->assertStringStartsWith('2026-08-10T10:00:00', $view->bookingDate);
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
            bookingDate: '2026-08-10 10:00:00'
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
            new CreateBookingCommand(999, 'Jane Doe', 'jane@example.com', '2026-08-10 10:00:00'),
            $this->client
        );
    }
}
