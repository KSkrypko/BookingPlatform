<?php

declare(strict_types=1);

namespace App\Booking\Application\Availability;

final readonly class AvailabilityDayView
{
    /**
     * @param list<string> $slots
     */
    public function __construct(
        public string $date,
        public array $slots
    ) {
    }
}