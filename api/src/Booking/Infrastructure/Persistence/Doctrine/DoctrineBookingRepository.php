<?php

declare(strict_types=1);

namespace App\Booking\Infrastructure\Persistence\Doctrine;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingConflictException;
use App\Booking\Domain\BookingRepositoryInterface;
use App\User\Domain\User;
use Doctrine\DBAL\LockMode;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineBookingRepository implements BookingRepositoryInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {
    }

    public function save(Booking $booking): void
    {
        $this->entityManager->getConnection()->transactional(function () use ($booking): void {
            $service = $booking->getService();
            $provider = $service->getProvider();

            if ($provider === null) {
                throw new \InvalidArgumentException('Usługa musi być przypisana do usługodawcy.');
            }

            $this->entityManager->lock($provider, LockMode::PESSIMISTIC_WRITE);
            $this->entityManager->refresh($service, LockMode::PESSIMISTIC_READ);
            $booking->assertBookable();

            if ($service->getProvider()?->getId() !== $provider->getId()) {
                throw new \InvalidArgumentException('Usługodawca usługi został zmieniony. Wybierz termin ponownie.');
            }

            $start = $booking->getBookingDate();
            $end = $start->modify(sprintf('+%d minutes', $service->getDurationMinutes()));

            if ($this->findOverlappingForProvider($provider, $start, $end) !== []) {
                throw new BookingConflictException();
            }

            $this->entityManager->persist($booking);
            $this->entityManager->flush();
        });
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

    public function findOverlappingForProvider(
        User $provider,
        \DateTimeImmutable $start,
        \DateTimeImmutable $end
    ): array {
        return $this->entityManager
            ->getRepository(Booking::class)
            ->createQueryBuilder('booking')
            ->innerJoin('booking.service', 'service')
            ->addSelect('service')
            ->andWhere('service.provider = :provider')
            ->andWhere("DATE_ADD(booking.bookingDate, service.durationMinutes, 'MINUTE') > :start")
            ->andWhere('booking.bookingDate < :end')
            ->setParameter('provider', $provider)
            ->setParameter('start', $start, Types::DATETIME_IMMUTABLE)
            ->setParameter('end', $end, Types::DATETIME_IMMUTABLE)
            ->orderBy('booking.bookingDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
