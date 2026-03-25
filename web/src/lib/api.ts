import type { AvailabilityDay, Booking } from '../types/booking';
import type { Service } from '../types/service';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

type CreateBookingPayload = {
  serviceId: number;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Wystąpił błąd podczas komunikacji z API.';

    throw new Error(message);
  }

  return data as T;
}

export function getServices(): Promise<Service[]> {
  return request<Service[]>('/services', {
    method: 'GET',
  });
}

export function getBookings(): Promise<Booking[]> {
  return request<Booking[]>('/bookings', {
    method: 'GET',
  });
}

export function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAvailability(serviceId: number, date: string): Promise<AvailabilityDay> {
  const params = new URLSearchParams({
    serviceId: String(serviceId),
    date,
  });

  return request<AvailabilityDay>(`/availability?${params.toString()}`, {
    method: 'GET',
  });
}