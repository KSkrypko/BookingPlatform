<?php

declare(strict_types=1);

namespace App\Service\Domain;

interface ServiceRepositoryInterface
{
    public function save(Service $service): void;

    /**
     * @return list<Service>
     */
    public function findAllActive(): array;
}