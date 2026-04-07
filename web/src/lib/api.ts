import type { AvailabilityDay, Booking } from '../types/booking';
import type { Service } from '../types/service';
import type { AccountType, AuthUser } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const TOKEN_STORAGE_KEY = 'booking_platform_token';

type CreateBookingPayload = {
  serviceId: number;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
};

type RegisterPayload = {
  email: string;
  password: string;
  accountType: AccountType;
};

type LoginPayload = {
  email: string;
  password: string;
};

type CreateServicePayload = {
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
};

type LoginResponse = {
  token: string;
};

function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function hasToken(): boolean {
  return getStoredToken() !== null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();

  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
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

export function createService(payload: CreateServicePayload): Promise<Service> {
  return request<Service>('/services', {
    method: 'POST',
    body: JSON.stringify(payload),
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

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return request<AuthUser>('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await request<LoginResponse>('/login_check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  saveToken(response.token);
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>('/me', {
    method: 'GET',
  });
}