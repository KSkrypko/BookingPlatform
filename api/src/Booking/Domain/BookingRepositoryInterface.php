<?php

declare(strict_types=1);

namespace App\Booking\Domain;

use App\User\Domain\User;

interface BookingRepositoryInterface
{
    public function save(Booking $booking): void;

    /**
     * @return list<Booking>
     */
    public function findVisibleToUser(User $user): array;

    /**
     * @return list<Booking>
     */
    public function findBetweenBookingDates(
        \DateTimeImmutable $start,
        \DateTimeImmutable $end
    ): array;
}
