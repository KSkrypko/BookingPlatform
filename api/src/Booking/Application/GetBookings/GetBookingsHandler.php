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
        $warsawTimezone = new \DateTimeZone('Europe/Warsaw');

        return array_map(
            static function (Booking $booking) use ($warsawTimezone): BookingListItemView {
                $bookingDateInWarsaw = new \DateTimeImmutable(
                    $booking->getBookingDate()->format('Y-m-d H:i:s'),
                    $warsawTimezone
                );

                $createdAtInWarsaw = new \DateTimeImmutable(
                    $booking->getCreatedAt()->format('Y-m-d H:i:s'),
                    $warsawTimezone
                );

                return new BookingListItemView(
                    id: $booking->getId() ?? 0,
                    serviceId: $booking->getServiceId(),
                    customerName: $booking->getCustomerName(),
                    customerEmail: $booking->getCustomerEmail(),
                    bookingDate: $bookingDateInWarsaw->format(\DateTimeInterface::ATOM),
                    createdAt: $createdAtInWarsaw->format(\DateTimeInterface::ATOM)
                );
            },
            $bookings
        );
    }
}