<?php

declare(strict_types=1);

namespace App\Booking\Application\CreateBooking;

final readonly class CreateBookingCommand
{
    public function __construct(
        public int $serviceId,
        public string $customerName,
        public string $customerEmail,
        public string $bookingDate
    ) {
    }
}