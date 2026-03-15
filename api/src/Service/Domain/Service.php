<?php

declare(strict_types=1);

namespace App\Service\Domain;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'services')]
class Service
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $price;

    #[ORM\Column(type: 'integer')]
    private int $durationMinutes;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive;

    public function __construct(
        string $name,
        ?string $description,
        string $price,
        int $durationMinutes
    ) {
        $this->setName($name);
        $this->setDescription($description);
        $this->setPrice($price);
        $this->setDurationMinutes($durationMinutes);
        $this->createdAt = new \DateTimeImmutable();
        $this->isActive = true;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function changeName(string $name): void
    {
        $this->setName($name);
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function changeDescription(?string $description): void
    {
        $this->setDescription($description);
    }

    public function getPrice(): string
    {
        return $this->price;
    }

    public function changePrice(string $price): void
    {
        $this->setPrice($price);
    }

    public function getDurationMinutes(): int
    {
        return $this->durationMinutes;
    }

    public function changeDurationMinutes(int $durationMinutes): void
    {
        $this->setDurationMinutes($durationMinutes);
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function activate(): void
    {
        $this->isActive = true;
    }

    public function deactivate(): void
    {
        $this->isActive = false;
    }

    private function setName(string $name): void
    {
        $name = trim($name);

        if ($name == '') {
            throw new \InvalidArgumentException('Service name cannot be empty.');
        }

        if (mb_strlen($name) > 255) {
            throw new \InvalidArgumentException('Service name cannot be longer than 255 characters.');
        }

        $this->name = $name;
    }

    private function setDescription(?string $description): void
    {
        if ($description === null) {
            $this->description = null;
            return;
        }

        $description = trim($description);

        $this->description = $description === '' ? null : $description;
    }

    private function setPrice(string $price): void
    {
        if (!is_numeric($price)) {
            throw new \InvalidArgumentException('Service price must be numeric.');
        }

        if ((float) $price <= 0) {
            throw new \InvalidArgumentException('Service price must be greater than zero.');
        }

        $this->price = number_format((float) $price, 2, '.', '');
    }

    private function setDurationMinutes(int $durationMinutes): void
    {
        if ($durationMinutes <= 0) {
            throw new \InvalidArgumentException('Service duration must be greater than zero.');
        }

        $this->durationMinutes = $durationMinutes;
    }
}