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

    public function findBetweenBookingDates(
        \DateTimeImmutable $start,
        \DateTimeImmutable $end
    ): array {
        return $this->entityManager
            ->getRepository(Booking::class)
            ->createQueryBuilder('booking')
            ->andWhere('booking.bookingDate >= :start')
            ->andWhere('booking.bookingDate < :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('booking.bookingDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}