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

        if (!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\z/', $command->bookingDate)) {
            throw new \InvalidArgumentException('Termin musi mieć format YYYY-MM-DDTHH:mm:ss w strefie Europe/Warsaw, bez offsetu.');
        }

        $bookingDateInWarsaw = \DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s', $command->bookingDate, $warsawTimezone);
        $errors = \DateTimeImmutable::getLastErrors();

        if (
            $bookingDateInWarsaw === false
            || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
            || $bookingDateInWarsaw->format('Y-m-d\TH:i:s') !== $command->bookingDate
        ) {
            throw new \InvalidArgumentException('Podaj prawidłową datę i godzinę rezerwacji.');
        }

        $booking = new Booking(
            $service,
            $client,
            $command->customerName,
            $command->customerEmail,
            $bookingDateInWarsaw
        );

        $booking->assertBookable();
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
