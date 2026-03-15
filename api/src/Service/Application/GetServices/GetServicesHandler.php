<?php

declare(strict_types=1);

namespace App\Service\Application\GetServices;

use App\Service\Domain\ServiceRepositoryInterface;

final readonly class GetServicesHandler
{
    public function __construct(
        private ServiceRepositoryInterface $serviceRepository
    ) {
    }

    /**
     * @return list<ServiceView>
     */
    public function handle(): array
    {
        $services = $this->serviceRepository->findAllActive();

        return array_map(
            static fn (\App\Service\Domain\Service $service): ServiceView => new ServiceView(
                id: $service->getId() ?? 0,
                name: $service->getName(),
                description: $service->getDescription(),
                price: $service->getPrice(),
                durationMinutes: $service->getDurationMinutes(),
                createdAt: $service->getCreatedAt()->format(\DateTimeInterface::ATOM)
            ),
            $services
        );
    }
}