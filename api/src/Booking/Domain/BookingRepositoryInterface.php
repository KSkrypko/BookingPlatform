<?php

declare(strict_types=1);

namespace App\Booking\Domain;

interface BookingRepositoryInterface
{
    public function save(Booking $booking): void;

    /**
     * @return list<Booking>
     */
    public function findAllOrderedByCreatedAtDesc(): array;
}