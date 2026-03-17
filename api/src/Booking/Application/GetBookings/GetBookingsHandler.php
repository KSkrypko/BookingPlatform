<?php

declare(strict_types=1);

namespace App\Booking\Application\GetBookings;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;

final readonly class GetBookingsHandler
{
    public function __construct(
        private BookingRepositoryInterface $bookingRepository
    ) {
    }

    /**
     * @return list<BookingListItemView>
     */
    public function handle(): array
    {
        $bookings = $this->bookingRepository->findAllOrderedByCreatedAtDesc();

        return array_map(
            static fn (Booking $booking): BookingListItemView => new BookingListItemView(
                id: $booking->getId() ?? 0,
                serviceId: $booking->getServiceId(),
                customerName: $booking->getCustomerName(),
                customerEmail: $booking->getCustomerEmail(),
                bookingDate: $booking->getBookingDate()->format(\DateTimeInterface::ATOM),
                createdAt: $booking->getCreatedAt()->format(\DateTimeInterface::ATOM)
            ),
            $bookings
        );
    }
}