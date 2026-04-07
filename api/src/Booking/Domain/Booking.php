<?php

declare(strict_types=1);

namespace App\Booking\Domain;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'bookings')]
class Booking
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private int $serviceId;

    #[ORM\Column(length: 255)]
    private string $customerName;

    #[ORM\Column(length: 255)]
    private string $customerEmail;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $bookingDate;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        int $serviceId,
        string $customerName,
        string $customerEmail,
        \DateTimeImmutable $bookingDate
    ) {
        $this->setServiceId($serviceId);
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
        return $this->serviceId;
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

    private function setServiceId(int $serviceId): void
    {
        if ($serviceId <= 0) {
            throw new \InvalidArgumentException('Service id must be greater than zero.');
        }

        $this->serviceId = $serviceId;
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