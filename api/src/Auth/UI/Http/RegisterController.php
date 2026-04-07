<?php

declare(strict_types=1);

namespace App\Auth\UI\Http;

use App\User\Domain\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class RegisterController extends AbstractController
{
    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $accountType = $data['accountType'] ?? null;

        if (!is_string($email) || !is_string($password) || !is_string($accountType)) {
            return $this->json(['message' => 'Missing or invalid required fields.'], Response::HTTP_BAD_REQUEST);
        }

        $email = mb_strtolower(trim($email));
        $password = trim($password);
        $accountType = trim($accountType);

        if ($password === '' || mb_strlen($password) < 6) {
            return $this->json(
                ['message' => 'Password must contain at least 6 characters.'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $roles = match ($accountType) {
            'client' => [User::ROLE_CLIENT],
            'provider' => [User::ROLE_PROVIDER],
            default => null,
        };

        if ($roles === null) {
            return $this->json(['message' => 'Unsupported account type.'], Response::HTTP_BAD_REQUEST);
        }

        $existingUser = $entityManager
            ->getRepository(User::class)
            ->findOneBy(['email' => $email]);

        if ($existingUser !== null) {
            return $this->json(['message' => 'User with this email already exists.'], Response::HTTP_CONFLICT);
        }

        $user = new User($email, '', $roles);
        $hashedPassword = $passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json(
            [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'accountType' => in_array(User::ROLE_PROVIDER, $user->getRoles(), true) ? 'provider' : 'client',
            ],
            Response::HTTP_CREATED
        );
    }
}