<?php

declare(strict_types=1);

namespace App\Service\UI\Http;

use App\Service\Application\GetServices\GetServicesHandler;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class GetServicesController extends AbstractController
{
    #[Route('/api/services', name: 'api_services_list', methods: ['GET'])]
    public function __invoke(GetServicesHandler $handler): JsonResponse
    {
        return $this->json($handler->handle());
    }
}