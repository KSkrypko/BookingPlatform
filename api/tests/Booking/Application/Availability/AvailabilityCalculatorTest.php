<?php

declare(strict_types=1);

namespace App\Tests\Booking\Application\Availability;

use App\Booking\Application\Availability\AvailabilityCalculator;
use App\Booking\Domain\Booking;
use App\Booking\Domain\BookingRepositoryInterface;
use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use App\User\Domain\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AvailabilityCalculatorTest extends TestCase
{
    public function testReturnsEmptySlotsWhenServiceDoesNotExist(): void
    {
        $bookingRepository = $this->createStub(BookingRepositoryInterface::class);
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturnMap([[1, null]]);

        $calculator = new AvailabilityCalculator($bookingRepository, $serviceRepository);

        $this->expectException(\InvalidArgumentException::class);

        $calculator->calculateForDay(1, new \DateTimeImmutable('+1 day'));
    }

    public function testReturnsEmptySlotsOnSunday(): void
    {
        $service = new Service('Haircut', null, '50.00', 30);
        $bookingRepository = $this->createStub(BookingRepositoryInterface::class);
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturnMap([[1, $service]]);

        $calculator = new AvailabilityCalculator($bookingRepository, $serviceRepository);

        $sunday = $this->nextDateForIsoWeekday(7);

        $slots = $calculator->calculateForDay(1, $sunday);

        $this->assertSame([], $slots);
    }

    public function testReturnsEmptySlotsForPastDay(): void
    {
        $service = new Service('Haircut', null, '50.00', 30);
        $bookingRepository = $this->createStub(BookingRepositoryInterface::class);
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturnMap([[1, $service]]);

        $calculator = new AvailabilityCalculator($bookingRepository, $serviceRepository);

        $slots = $calculator->calculateForDay(1, new \DateTimeImmutable('yesterday'));

        $this->assertSame([], $slots);
    }

    public function testGeneratesSlotsRespectingServiceDurationAndBusinessHours(): void
    {
        $service = new Service('Consultation', null, '100.00', 60);
        $bookingRepository = $this->createStub(BookingRepositoryInterface::class);
        $bookingRepository->method('findBetweenBookingDates')->willReturn([]);
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturnMap([[1, $service]]);

        $calculator = new AvailabilityCalculator($bookingRepository, $serviceRepository);

        $day = $this->nextDateForIsoWeekday(1, 14);

        $slots = $calculator->calculateForDay(1, $day);

        $this->assertNotEmpty($slots);
        $this->assertSame('09:00', $slots[0]);
        $this->assertSame('16:00', $slots[array_key_last($slots)]);

        foreach ($slots as $slot) {
            $this->assertLessThanOrEqual('16:00', $slot);
            $this->assertGreaterThanOrEqual('09:00', $slot);
        }
    }

    #[DataProvider('overlappingSlots')]
    public function testExcludesSlotsOverlappingExistingBookings(
        int $durationMinutes,
        array $occupiedSlots,
        string $precedingSlot
    ): void
    {
        $service = new Service('Consultation', null, '100.00', $durationMinutes);
        $bookedService = new Service('Treatment', null, '150.00', 60);
        (new \ReflectionProperty(Service::class, 'id'))->setValue($service, 1);
        (new \ReflectionProperty(Service::class, 'id'))->setValue($bookedService, 2);
        $day = $this->nextDateForIsoWeekday(1, 14);

        $existingBooking = new Booking(
            $bookedService,
            new User('jane@example.com', 'hash', [User::ROLE_CLIENT]),
            'Jane Doe',
            'jane@example.com',
            $day->setTime(10, 0)
        );

        $bookingRepository = $this->createStub(BookingRepositoryInterface::class);
        $bookingRepository->method('findBetweenBookingDates')->willReturn([$existingBooking]);
        $serviceRepository = $this->createStub(ServiceRepositoryInterface::class);
        $serviceRepository->method('findActiveById')->willReturnMap([
            [1, $service],
            [2, $bookedService],
        ]);

        $calculator = new AvailabilityCalculator($bookingRepository, $serviceRepository);

        $slots = $calculator->calculateForDay(1, $day);

        foreach ($occupiedSlots as $slot) {
            $this->assertNotContains($slot, $slots);
        }

        $this->assertContains($precedingSlot, $slots);
        $this->assertContains('11:00', $slots);
    }

    public static function overlappingSlots(): array
    {
        return [
            '60-minute service' => [
                60,
                ['09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45'],
                '09:00',
            ],
            '30-minute service' => [
                30,
                ['09:45', '10:00', '10:15', '10:30', '10:45'],
                '09:30',
            ],
        ];
    }

    private function nextDateForIsoWeekday(int $isoWeekday, int $daysAhead = 1): \DateTimeImmutable
    {
        $date = new \DateTimeImmutable(sprintf('+%d days', $daysAhead));

        while ((int) $date->format('N') !== $isoWeekday) {
            $date = $date->modify('+1 day');
        }

        return $date;
    }
}
