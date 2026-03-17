<?php

declare(strict_types=1);

namespace App\Booking\Application\GetBookings;

final readonly class BookingListItemView
{
    public function __construct(
        public int $id,
        public int $serviceId,
        public string $customerName,
        public string $customerEmail,
        public string $bookingDate,
        public string $createdAt
    ) {
    }
}