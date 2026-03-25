<?php

declare(strict_types=1);

namespace App\Booking\UI\Http;

use App\Booking\Application\Availability\AvailabilityCalculator;
use App\Booking\Application\Availability\AvailabilityDayView;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/availability')]
final class AvailabilityController extends AbstractController
{
    #[Route('', name: 'api_availability_day', methods: ['GET'])]
    public function day(
        AvailabilityCalculator $availabilityCalculator
    ): JsonResponse {
        $serviceId = $this->getRequestServiceId();
        $date = $this->getRequestDate();

        if ($serviceId === null || $date === null) {
            return $this->json(
                ['message' => 'Parametry serviceId i date są wymagane.'],
                Response::HTTP_BAD_REQUEST
            );
        }

        try {
            $slots = $availabilityCalculator->calculateForDay(
                $serviceId,
                new \DateTimeImmutable($date)
            );
        } catch (\Throwable $exception) {
            return $this->json(
                ['message' => $exception->getMessage()],
                Response::HTTP_BAD_REQUEST
            );
        }

        return $this->json(
            new AvailabilityDayView(
                date: $date,
                slots: $slots
            )
        );
    }

    private function getRequestServiceId(): ?int
    {
        $value = $this->container->get('request_stack')->getCurrentRequest()?->query->get('serviceId');

        if ($value === null || !ctype_digit((string) $value)) {
            return null;
        }

        return (int) $value;
    }

    private function getRequestDate(): ?string
    {
        $value = $this->container->get('request_stack')->getCurrentRequest()?->query->get('date');

        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        return $value;
    }
}