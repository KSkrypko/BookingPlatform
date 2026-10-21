import type { AvailabilityDay, Booking } from '../types/booking';
import type { Service } from '../types/service';
import type { AccountType, AuthUser } from '../types/auth';

const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8000/api';
const TOKEN_STORAGE_KEY = 'booking_platform_token';
const API_ERROR_MESSAGE = 'Wystąpił błąd podczas komunikacji z API.';

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

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isService(value: unknown): value is Service {
  return isRecord(value)
    && typeof value.id === 'number'
    && typeof value.name === 'string'
    && (value.description === null || typeof value.description === 'string')
    && typeof value.price === 'string'
    && typeof value.durationMinutes === 'number'
    && typeof value.createdAt === 'string';
}

function isBooking(value: unknown): value is Booking {
  return isRecord(value)
    && typeof value.id === 'number'
    && typeof value.serviceId === 'number'
    && typeof value.customerName === 'string'
    && typeof value.customerEmail === 'string'
    && typeof value.bookingDate === 'string'
    && typeof value.createdAt === 'string';
}

function isAuthUser(value: unknown): value is AuthUser {
  return isRecord(value)
    && typeof value.id === 'number'
    && typeof value.email === 'string'
    && Array.isArray(value.roles)
    && value.roles.every((role) => typeof role === 'string')
    && (value.accountType === 'client' || value.accountType === 'provider');
}

function isAvailabilityDay(value: unknown): value is AvailabilityDay {
  return isRecord(value)
    && typeof value.date === 'string'
    && Array.isArray(value.slots)
    && value.slots.every((slot) => typeof slot === 'string');
}

function isLoginResponse(value: unknown): value is LoginResponse {
  return isRecord(value) && typeof value.token === 'string' && value.token.trim() !== '';
}

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

async function request<T>(
  path: string,
  isValidResponse: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<T> {
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

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const isJson = contentType === 'application/json'
    || (contentType?.startsWith('application/') && contentType.endsWith('+json'));

  if (!isJson) {
    throw new ApiError(response.status, API_ERROR_MESSAGE);
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, API_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.message === 'string' && data.message.trim() !== ''
        ? data.message
        : API_ERROR_MESSAGE;

    throw new ApiError(response.status, message);
  }

  if (!isValidResponse(data)) {
    throw new ApiError(response.status, API_ERROR_MESSAGE);
  }

  return data;
}

export function getServices(): Promise<Service[]> {
  return request('/services', (value): value is Service[] => Array.isArray(value) && value.every(isService), {
    method: 'GET',
  });
}

export function createService(payload: CreateServicePayload): Promise<Service> {
  return request('/services', isService, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getBookings(): Promise<Booking[]> {
  return request('/bookings', (value): value is Booking[] => Array.isArray(value) && value.every(isBooking), {
    method: 'GET',
  });
}

export function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return request('/bookings', isBooking, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAvailability(serviceId: number, date: string): Promise<AvailabilityDay> {
  const params = new URLSearchParams({
    serviceId: String(serviceId),
    date,
  });

  return request(`/availability?${params.toString()}`, isAvailabilityDay, {
    method: 'GET',
  });
}

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return request('/register', isAuthUser, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await request('/login_check', isLoginResponse, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  saveToken(response.token);
}

export function getMe(): Promise<AuthUser> {
  return request('/me', isAuthUser, {
    method: 'GET',
  });
}
