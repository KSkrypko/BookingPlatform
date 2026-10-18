<?php

declare(strict_types=1);

namespace App\Booking\Application\CreateBooking;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\Service\Domain\ServiceRepositoryInterface;
use App\User\Domain\User;

final readonly class CreateBookingHandler
{
    public function __construct(
        private BookingRepositoryInterface $bookingRepository,
        private ServiceRepositoryInterface $serviceRepository
    ) {
    }

    public function handle(CreateBookingCommand $command, User $client): BookingView
    {
        $service = $this->serviceRepository->findActiveById($command->serviceId);

        if ($service === null) {
            throw new \InvalidArgumentException('Wybrana usługa nie istnieje.');
        }

        $warsawTimezone = new \DateTimeZone('Europe/Warsaw');

        $bookingDateInWarsaw = new \DateTimeImmutable(
            $command->bookingDate,
            $warsawTimezone
        );

        $booking = new Booking(
            $service,
            $client,
            $command->customerName,
            $command->customerEmail,
            $bookingDateInWarsaw
        );

        $this->bookingRepository->save($booking);

        $createdAtInWarsaw = new \DateTimeImmutable(
            $booking->getCreatedAt()->format('Y-m-d H:i:s'),
            $warsawTimezone
        );

        return new BookingView(
            id: $booking->getId() ?? 0,
            serviceId: $booking->getServiceId(),
            customerName: $booking->getCustomerName(),
            customerEmail: $booking->getCustomerEmail(),
            bookingDate: $bookingDateInWarsaw->format(\DateTimeInterface::ATOM),
            createdAt: $createdAtInWarsaw->format(\DateTimeInterface::ATOM)
        );
    }
}
