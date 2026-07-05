<?php

declare(strict_types=1);

namespace App\Tests\Booking\Application\CreateBooking;

use App\Booking\Application\CreateBooking\CreateBookingCommand;
use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use PHPUnit\Framework\TestCase;

final class CreateBookingHandlerTest extends TestCase
{
    public function testCreatesBookingAndReturnsWarsawLocalizedView(): void
    {
        $bookingRepository = $this->createMock(BookingRepositoryInterface::class);
        $bookingRepository
            ->expects($this->once())
            ->method('save')
            ->with($this->isInstanceOf(Booking::class));

        $handler = new CreateBookingHandler($bookingRepository);

        $command = new CreateBookingCommand(
            serviceId: 1,
            customerName: 'Jane Doe',
            customerEmail: 'jane@example.com',
            bookingDate: '2026-08-10 10:00:00'
        );

        $view = $handler->handle($command);

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

        $handler = new CreateBookingHandler($bookingRepository);

        $command = new CreateBookingCommand(
            serviceId: 1,
            customerName: 'Jane Doe',
            customerEmail: 'not-an-email',
            bookingDate: '2026-08-10 10:00:00'
        );

        $this->expectException(\InvalidArgumentException::class);

        $handler->handle($command);
    }
}
