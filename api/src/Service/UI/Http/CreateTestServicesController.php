<?php

declare(strict_types=1);

namespace App\Service\UI\Http;

use App\Service\Domain\Service;
use App\Service\Domain\ServiceRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class CreateTestServicesController extends AbstractController
{
    #[Route('/api/dev/services/seed', name: 'api_dev_services_seed', methods: ['POST'])]
    public function __invoke(ServiceRepositoryInterface $serviceRepository): JsonResponse
    {
        $serviceRepository->save(new Service('Eyebrow Lamination', 'Eyebrow styling and lamination treatment.', '120.00', 45));
        $serviceRepository->save(new Service('Lash Lift', 'Natural lash lifting treatment.', '150.00', 60));
        $serviceRepository->save(new Service('Hydrafacial', 'Deep facial cleansing and hydration.', '200.00', 60));

        return $this->json(['status' => 'ok']);
    }
}