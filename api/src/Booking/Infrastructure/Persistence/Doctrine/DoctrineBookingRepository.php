<?php

declare(strict_types=1);

namespace App\Booking\Infrastructure\Persistence\Doctrine;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineBookingRepository implements BookingRepositoryInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {
    }

    public function save(Booking $booking): void
    {
        $this->entityManager->persist($booking);
        $this->entityManager->flush();
    }

    public function findAllOrderedByCreatedAtDesc(): array
    {
        return $this->entityManager
            ->getRepository(Booking::class)
            ->findBy([], ['createdAt' => 'DESC']);
    }
}