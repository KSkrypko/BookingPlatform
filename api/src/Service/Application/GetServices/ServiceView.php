<?php

declare(strict_types=1);

namespace App\Service\Application\GetServices;

final readonly class ServiceView
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $description,
        public string $price,
        public int $durationMinutes,
        public string $createdAt
    ) {
    }
}