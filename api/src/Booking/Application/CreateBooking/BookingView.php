<?php

declare(strict_types=1);

namespace App\Booking\Application\CreateBooking;

final readonly class BookingView
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