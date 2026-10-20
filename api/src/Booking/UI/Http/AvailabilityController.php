<?php

declare(strict_types=1);

namespace App\Booking\UI\Http;

use App\Booking\Application\Availability\AvailabilityCalculator;
use App\Booking\Application\Availability\AvailabilityDayView;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/availability')]
final class AvailabilityController extends AbstractController
{
    #[Route('', name: 'api_availability_day', methods: ['GET'])]
    public function day(
        AvailabilityCalculator $availabilityCalculator,
        LoggerInterface $logger
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
            $day = \DateTimeImmutable::createFromFormat('!Y-m-d', $date, new \DateTimeZone('Europe/Warsaw'));
            $errors = \DateTimeImmutable::getLastErrors();

            if (
                $day === false
                || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
                || $day->format('Y-m-d') !== $date
            ) {
                throw new \InvalidArgumentException('Podaj prawidłową datę.');
            }

            $slots = $availabilityCalculator->calculateForDay(
                $serviceId,
                $day
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(
                ['message' => $exception->getMessage()],
                Response::HTTP_BAD_REQUEST
            );
        } catch (\Throwable $exception) {
            $logger->error('Availability calculation failed.', ['exception' => $exception]);

            return $this->json(['message' => 'Nie udało się pobrać dostępności.'], Response::HTTP_INTERNAL_SERVER_ERROR);
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

        if (!is_string($value) || !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}\z/', $value)) {
            return null;
        }

        return $value;
    }
}