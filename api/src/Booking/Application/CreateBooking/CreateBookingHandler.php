<?php

declare(strict_types=1);

namespace App\Booking\Application\CreateBooking;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;

final readonly class CreateBookingHandler
{
    public function __construct(
        private BookingRepositoryInterface $bookingRepository
    ) {
    }

    public function handle(CreateBookingCommand $command): BookingView
    {
        $booking = new Booking(
            $command->serviceId,
            $command->customerName,
            $command->customerEmail,
            new \DateTimeImmutable($command->bookingDate)
        );

        $this->bookingRepository->save($booking);

        return new BookingView(
            id: $booking->getId() ?? 0,
            serviceId: $booking->getServiceId(),
            customerName: $booking->getCustomerName(),
            customerEmail: $booking->getCustomerEmail(),
            bookingDate: $booking->getBookingDate()->format(\DateTimeInterface::ATOM),
            createdAt: $booking->getCreatedAt()->format(\DateTimeInterface::ATOM)
        );
    }
}