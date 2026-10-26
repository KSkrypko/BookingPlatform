<?php

declare(strict_types=1);

namespace App\Booking\Domain;

use App\Service\Domain\Service;
use App\User\Domain\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'bookings')]
#[ORM\Index(name: 'idx_bookings_service', columns: ['service_id'])]
#[ORM\Index(name: 'idx_bookings_client', columns: ['client_id'])]
class Booking
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_id', nullable: false)]
    private Service $service;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'client_id', nullable: true)]
    private ?User $client = null;

    #[ORM\Column(length: 255)]
    private string $customerName;

    #[ORM\Column(length: 255)]
    private string $customerEmail;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $bookingDate;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Service $service,
        User $client,
        string $customerName,
        string $customerEmail,
        \DateTimeImmutable $bookingDate
    ) {
        $this->service = $service;
        $this->client = $client;
        $this->setCustomerName($customerName);
        $this->setCustomerEmail($customerEmail);
        $this->bookingDate = $bookingDate->setTimezone(new \DateTimeZone('Europe/Warsaw'));
        $this->createdAt = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw'));
    }

    public function assertBookable(): void
    {
        if (!$this->service->isActive() || $this->service->getProvider() === null) {
            throw new \InvalidArgumentException('Usługa musi być aktywna i przypisana do usługodawcy.');
        }

        $start = $this->bookingDate;
        $now = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw'));
        $end = $start->modify(sprintf('+%d minutes', $this->service->getDurationMinutes()));

        if (
            $start <= $now
            || (int) $start->format('N') === 7
            || $start < $start->setTime(9, 0)
            || $end > $start->setTime(17, 0)
            || (int) $start->format('i') % 15 !== 0
            || $start->format('s.u') !== '00.000000'
        ) {
            throw new \InvalidArgumentException('Termin musi być przyszły, od poniedziałku do soboty, w godzinach 09:00-17:00, co 15 minut.');
        }
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getServiceId(): int
    {
        return $this->service->getId() ?? 0;
    }

    public function getService(): Service
    {
        return $this->service;
    }

    public function getClient(): ?User
    {
        return $this->client;
    }

    public function getCustomerName(): string
    {
        return $this->customerName;
    }

    public function getCustomerEmail(): string
    {
        return $this->customerEmail;
    }

    public function getBookingDate(): \DateTimeImmutable
    {
        return $this->bookingDate;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    private function setCustomerName(string $customerName): void
    {
        $customerName = trim($customerName);

        if ($customerName === '') {
            throw new \InvalidArgumentException('Customer name cannot be empty.');
        }

        if (mb_strlen($customerName) > 255) {
            throw new \InvalidArgumentException('Customer name cannot be longer than 255 characters.');
        }

        $this->customerName = $customerName;
    }

    private function setCustomerEmail(string $customerEmail): void
    {
        $customerEmail = trim($customerEmail);

        if ($customerEmail === '') {
            throw new \InvalidArgumentException('Customer email cannot be empty.');
        }

        if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Customer email must be valid.');
        }

        $this->customerEmail = $customerEmail;
    }
}
