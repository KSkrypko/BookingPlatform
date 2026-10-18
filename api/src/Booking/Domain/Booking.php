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
        $this->bookingDate = $bookingDate;
        $this->createdAt = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw'));
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
