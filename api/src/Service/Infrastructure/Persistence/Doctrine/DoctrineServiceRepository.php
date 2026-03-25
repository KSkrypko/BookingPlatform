<?php

declare(strict_types=1);

namespace App\Service\Infrastructure\Persistence\Doctrine;

use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineServiceRepository implements ServiceRepositoryInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {
    }

    public function save(Service $service): void
    {
        $this->entityManager->persist($service);
        $this->entityManager->flush();
    }

    public function findAllActive(): array
    {
        return $this->entityManager
            ->getRepository(Service::class)
            ->findBy(['isActive' => true], ['createdAt' => 'DESC']);
    }

    public function findActiveById(int $id): ?Service
    {
        return $this->entityManager
            ->getRepository(Service::class)
            ->findOneBy([
                'id' => $id,
                'isActive' => true,
            ]);
    }
}