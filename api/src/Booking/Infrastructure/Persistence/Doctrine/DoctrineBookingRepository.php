<?php

declare(strict_types=1);

namespace App\Booking\Infrastructure\Persistence\Doctrine;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\User\Domain\User;
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

    public function findVisibleToUser(User $user): array
    {
        if ($user->getId() === null) {
            return [];
        }

        $queryBuilder = $this->entityManager
            ->getRepository(Booking::class)
            ->createQueryBuilder('booking')
            ->orderBy('booking.createdAt', 'DESC');

        if (in_array(User::ROLE_PROVIDER, $user->getRoles(), true)) {
            $queryBuilder
                ->innerJoin('booking.service', 'service')
                ->andWhere('service.provider = :user')
                ->andWhere('booking.client IS NOT NULL');
        } elseif (in_array(User::ROLE_CLIENT, $user->getRoles(), true)) {
            $queryBuilder->andWhere('booking.client = :user');
        } else {
            return [];
        }

        return $queryBuilder
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
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
