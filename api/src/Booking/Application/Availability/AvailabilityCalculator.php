<?php

declare(strict_types=1);

namespace App\Booking\Application\Availability;

use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\Service\Domain\ServiceRepositoryInterface;

final readonly class AvailabilityCalculator
{
    public function __construct(
        private BookingRepositoryInterface $bookingRepository,
        private ServiceRepositoryInterface $serviceRepository
    ) {
    }

    /**
     * @return list<string>
     */
    public function calculateForDay(int $serviceId, \DateTimeImmutable $date): array
    {
        $service = $this->serviceRepository->findActiveById($serviceId);

        if ($service === null) {
            throw new \InvalidArgumentException('Wybrana usługa nie istnieje.');
        }

        $day = $date->setTime(0, 0);
        $today = new \DateTimeImmutable('today');

        if ($day < $today) {
            return [];
        }

        // niedziela zamknięta
        if ((int) $day->format('N') === 7) {
            return [];
        }

        $openAt = $day->setTime(9, 0);
        $closeAt = $day->setTime(17, 0);
        $now = new \DateTimeImmutable();

        $existingBookings = $this->bookingRepository->findBetweenBookingDates($openAt, $closeAt);

        $occupiedIntervals = array_map(
            function (Booking $booking): array {
                $bookedService = $this->serviceRepository->findActiveById($booking->getServiceId());

                if ($bookedService === null) {
                    return [
                        'start' => $booking->getBookingDate(),
                        'end' => $booking->getBookingDate()->modify('+15 minutes'),
                    ];
                }

                $start = $booking->getBookingDate();
                $end = $start->modify(sprintf('+%d minutes', $bookedService->getDurationMinutes()));

                return [
                    'start' => $start,
                    'end' => $end,
                ];
            },
            $existingBookings
        );

        $slots = [];
        $slotStart = $openAt;

        while (true) {
            $slotEnd = $slotStart->modify(sprintf('+%d minutes', $service->getDurationMinutes()));

            if ($slotEnd > $closeAt) {
                break;
            }

            if ($day->format('Y-m-d') === $now->format('Y-m-d') && $slotStart <= $now) {
                $slotStart = $slotStart->modify('+15 minutes');
                continue;
            }

            $isFree = true;

            foreach ($occupiedIntervals as $interval) {
                if ($slotStart < $interval['end'] && $slotEnd > $interval['start']) {
                    $isFree = false;
                    break;
                }
            }

            if ($isFree) {
                $slots[] = $slotStart->format('H:i');
            }

            $slotStart = $slotStart->modify('+15 minutes');
        }

        return $slots;
    }
}