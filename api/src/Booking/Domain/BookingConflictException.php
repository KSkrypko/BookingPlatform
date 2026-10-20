<?php

declare(strict_types=1);

namespace App\Booking\Domain;

final class BookingConflictException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Wybrany termin jest już zajęty.');
    }
}
