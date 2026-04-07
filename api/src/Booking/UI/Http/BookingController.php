<?php

declare(strict_types=1);

namespace App\Booking\UI\Http;

use App\Booking\Application\CreateBooking\CreateBookingCommand;
use App\Booking\Application\CreateBooking\CreateBookingHandler;
use App\Booking\Application\GetBookings\GetBookingsHandler;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bookings')]
final class BookingController extends AbstractController
{
    #[Route('', name: 'api_bookings_create', methods: ['POST'])]
    #[IsGranted('ROLE_CLIENT')]
    public function create(Request $request, CreateBookingHandler $handler): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid JSON payload'], Response::HTTP_BAD_REQUEST);
        }

        $serviceId = $data['serviceId'] ?? null;
        $customerName = $data['customerName'] ?? null;
        $customerEmail = $data['customerEmail'] ?? null;
        $bookingDate = $data['bookingDate'] ?? null;

        if (
            !is_int($serviceId) ||
            !is_string($customerName) ||
            !is_string($customerEmail) ||
            !is_string($bookingDate)
        ) {
            return $this->json(['message' => 'Missing or invalid required fields'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $booking = $handler->handle(
                new CreateBookingCommand(
                    $serviceId,
                    $customerName,
                    $customerEmail,
                    $bookingDate
                )
            );
        } catch (\Throwable $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($booking, Response::HTTP_CREATED);
    }

    #[Route('', name: 'api_bookings_list', methods: ['GET'])]
    public function list(GetBookingsHandler $handler): JsonResponse
    {
        return $this->json($handler->handle());
    }
}