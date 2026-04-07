<?php

declare(strict_types=1);

namespace App\Service\UI\Http;

use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class CreateServiceController extends AbstractController
{
    #[Route('/api/services', name: 'api_services_create', methods: ['POST'])]
    #[IsGranted('ROLE_PROVIDER')]
    public function __invoke(Request $request, ServiceRepositoryInterface $serviceRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid JSON payload.'], Response::HTTP_BAD_REQUEST);
        }

        $name = $data['name'] ?? null;
        $description = $data['description'] ?? null;
        $price = $data['price'] ?? null;
        $durationMinutes = $data['durationMinutes'] ?? null;

        if (
            !is_string($name) ||
            (!is_string($description) && $description !== null) ||
            !is_string($price) ||
            !is_int($durationMinutes)
        ) {
            return $this->json(['message' => 'Missing or invalid required fields.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $service = new Service(
                $name,
                $description,
                $price,
                $durationMinutes
            );

            $serviceRepository->save($service);
        } catch (\Throwable $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(
            [
                'id' => $service->getId(),
                'name' => $service->getName(),
                'description' => $service->getDescription(),
                'price' => $service->getPrice(),
                'durationMinutes' => $service->getDurationMinutes(),
                'createdAt' => $service->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            Response::HTTP_CREATED
        );
    }
}