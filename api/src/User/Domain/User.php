<?php

declare(strict_types=1);

namespace App\User\Domain;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity]
#[ORM\Table(name: 'users')]
#[ORM\UniqueConstraint(name: 'uniq_users_email', columns: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    public const ROLE_CLIENT = 'ROLE_CLIENT';
    public const ROLE_PROVIDER = 'ROLE_PROVIDER';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $email;

    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    private string $password;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $email, string $password, array $roles)
    {
        $this->setEmail($email);
        $this->password = $password;
        $this->setRoles($roles);
        $this->createdAt = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw'));
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        return array_values(array_unique($roles));
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): void
    {
        $this->password = $password;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function eraseCredentials(): void
    {
    }

    private function setEmail(string $email): void
    {
        $email = mb_strtolower(trim($email));

        if ($email === '') {
            throw new \InvalidArgumentException('Email cannot be empty.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Email must be valid.');
        }

        $this->email = $email;
    }

    private function setRoles(array $roles): void
    {
        $allowedRoles = [self::ROLE_CLIENT, self::ROLE_PROVIDER];
        $normalizedRoles = array_values(array_unique($roles));

        if ($normalizedRoles === []) {
            throw new \InvalidArgumentException('At least one role is required.');
        }

        foreach ($normalizedRoles as $role) {
            if (!in_array($role, $allowedRoles, true)) {
                throw new \InvalidArgumentException('Unsupported user role.');
            }
        }

        $this->roles = $normalizedRoles;
    }
}