import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import {
  ApiError,
  createBooking,
  createService,
  getAvailability,
  getBookings,
  getMe,
  getServices,
  hasToken,
  login,
  register,
  saveToken,
} from '../src/lib/api.js';
import { getAuthErrorMessage } from '../src/lib/authErrors.js';

const fallback = 'Wystąpił błąd podczas komunikacji z API.';
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const service = {
  id: 1,
  name: 'Konsultacja',
  description: null,
  price: '150.00',
  durationMinutes: 60,
  createdAt: '2026-10-20T09:00:00+02:00',
};
const bookingPayload = {
  serviceId: 1,
  customerName: 'Jan Kowalski',
  customerEmail: 'jan@example.com',
  bookingDate: '2026-10-21T10:00:00',
};
const booking = {
  ...bookingPayload,
  id: 2,
  bookingDate: '2026-10-21T10:00:00+02:00',
  createdAt: '2026-10-20T09:00:00+02:00',
};
const credentials = { email: 'jan@example.com', password: 'test123' };
const registration = { ...credentials, accountType: 'client' as const };
const user = {
  id: 3,
  email: credentials.email,
  roles: ['ROLE_CLIENT', 'ROLE_USER'],
  accountType: 'client',
};

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });
});

afterEach(() => {
  mock.restoreAll();
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

function respondWith(data: unknown, status = 200) {
  return mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

for (const [status, message] of [
  [400, 'Hasło musi zawierać co najmniej 6 znaków.'],
  [401, 'Nieprawidłowe dane.'],
  [403, 'Brak uprawnień.'],
  [409, 'Wybrany termin jest już zajęty.'],
  [500, 'Nie udało się pobrać dostępności.'],
] as const) {
  test(`preserves HTTP ${status} and the API message without clearing the token`, async () => {
    respondWith({ message }, status);
    saveToken('existing-token');

    await assert.rejects(getBookings, (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.ok(error instanceof Error);
      assert.equal(error.name, 'ApiError');
      assert.equal(error.status, status);
      assert.equal(error.message, message);
      return true;
    });
    assert.equal(window.localStorage.getItem('booking_platform_token'), 'existing-token');
  });
}

for (const status of [200, 400, 401, 403, 409, 500]) {
  for (const body of ['{broken', '']) {
    test(`wraps ${body ? 'malformed' : 'empty'} JSON with HTTP ${status}`, async () => {
      mock.method(globalThis, 'fetch', async () => new Response(body, {
        status,
        headers: { 'Content-Type': 'application/json' },
      }));

      await assert.rejects(getServices, { name: 'ApiError', status, message: fallback });
    });
  }

  test(`rejects an HTML response with HTTP ${status}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response('<html>Internal error</html>', {
      status,
      headers: { 'Content-Type': 'text/html' },
    }));

    await assert.rejects(getServices, { name: 'ApiError', status, message: fallback });
  });
}

for (const body of [null, 'Internal error', 123, [], {}, { message: null }, { message: 123 }, { message: '' }, { message: '   ' }]) {
  test(`uses the fallback for an unexpected error body: ${JSON.stringify(body)}`, async () => {
    respondWith(body, 500);

    await assert.rejects(getServices, { name: 'ApiError', status: 500, message: fallback });
  });
}

for (const contentType of ['application/json; charset=utf-8', 'Application/JSON', 'application/problem+json']) {
  test(`reads JSON messages with content type ${contentType}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: 'Nieprawidłowe dane.' }), {
      status: 401,
      headers: { 'Content-Type': contentType },
    }));

    await assert.rejects(getMe, { name: 'ApiError', status: 401, message: 'Nieprawidłowe dane.' });
  });
}

test('rejects JSON without a JSON content type', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify([service]), {
    headers: { 'Content-Type': 'text/plain' },
  }));

  await assert.rejects(getServices, { name: 'ApiError', status: 200, message: fallback });
});

test('rejects an unexpected 204 response for an endpoint that requires JSON', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));

  await assert.rejects(getServices, { name: 'ApiError', status: 204, message: fallback });
});

for (const { name, run, data, status } of [
  { name: 'services', run: getServices, data: [service], status: 200 },
  { name: 'bookings', run: getBookings, data: [booking], status: 200 },
  { name: 'created service', run: () => createService(service), data: service, status: 201 },
  { name: 'created booking', run: () => createBooking(bookingPayload), data: booking, status: 201 },
  { name: 'availability', run: () => getAvailability(1, '2026-10-21'), data: { date: '2026-10-21', slots: ['09:00', '10:00'] }, status: 200 },
  { name: 'registered user', run: () => register(registration), data: user, status: 201 },
  { name: 'current user', run: getMe, data: user, status: 200 },
]) {
  test(`returns a valid ${name} response unchanged`, async () => {
    respondWith(data, status);

    assert.deepEqual(await run(), data);
  });
}

test('accepts empty collections and availability without slots', async () => {
  respondWith([]);
  assert.deepEqual(await getServices(), []);
  assert.deepEqual(await getBookings(), []);

  mock.restoreAll();
  respondWith({ date: '2026-10-21', slots: [] });
  assert.deepEqual(await getAvailability(1, '2026-10-21'), { date: '2026-10-21', slots: [] });
});

test('accepts a provider account', async () => {
  const provider = { ...user, accountType: 'provider', roles: ['ROLE_PROVIDER', 'ROLE_USER'] };
  respondWith(provider);

  assert.deepEqual(await getMe(), provider);
});

for (const { name, run, data } of [
  { name: 'null service list', run: getServices, data: null },
  { name: 'object instead of a service list', run: getServices, data: { message: 'Internal error' } },
  { name: 'null service in a list', run: getServices, data: [null] },
  { name: 'invalid service fields', run: getServices, data: [{ ...service, price: 150 }] },
  { name: 'invalid created service', run: () => createService(service), data: {} },
  { name: 'invalid booking list', run: getBookings, data: [service] },
  { name: 'invalid created booking', run: () => createBooking(bookingPayload), data: { ...booking, bookingDate: null } },
  { name: 'invalid availability slots', run: () => getAvailability(1, '2026-10-21'), data: { date: '2026-10-21', slots: [9] } },
  { name: 'missing availability slots', run: () => getAvailability(1, '2026-10-21'), data: { date: '2026-10-21' } },
  { name: 'invalid account type', run: getMe, data: { ...user, accountType: 'admin' } },
  { name: 'invalid user roles', run: getMe, data: { ...user, roles: [null] } },
  { name: 'invalid registration response', run: () => register(registration), data: {} },
]) {
  test(`rejects a successful response containing ${name}`, async () => {
    respondWith(data);

    await assert.rejects(run, { name: 'ApiError', status: 200, message: fallback });
  });
}

test('keeps the booking request URL, method, payload and bearer token', async () => {
  const fetchMock = respondWith(booking, 201);
  saveToken('existing-token');

  await createBooking(bookingPayload);

  const [url, init] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, 'http://localhost:8000/api/bookings');
  assert.equal(init?.method, 'POST');
  assert.deepEqual(JSON.parse(init?.body as string), bookingPayload);
  const headers = new Headers(init?.headers);
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Authorization'), 'Bearer existing-token');
});

test('requests availability with the existing query parameters and no token', async () => {
  const fetchMock = respondWith({ date: '2026-10-21', slots: [] });

  await getAvailability(1, '2026-10-21');

  const [url, init] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, 'http://localhost:8000/api/availability?serviceId=1&date=2026-10-21');
  assert.equal(init?.method, 'GET');
  assert.equal(new Headers(init?.headers).has('Authorization'), false);
});

test('stores a valid login token', async () => {
  respondWith({ token: 'new-token' });

  await login(credentials);

  assert.equal(hasToken(), true);
  assert.equal(window.localStorage.getItem('booking_platform_token'), 'new-token');
});

for (const data of [null, {}, { token: null }, { token: 123 }, { token: '' }, { token: '   ' }]) {
  test(`does not overwrite the token after an invalid login response: ${JSON.stringify(data)}`, async () => {
    respondWith(data);
    saveToken('existing-token');

    await assert.rejects(() => login(credentials), { name: 'ApiError', status: 200, message: fallback });
    assert.equal(window.localStorage.getItem('booking_platform_token'), 'existing-token');
  });
}

test('preserves safe authentication messages and keeps filtering technical messages', async () => {
  for (const [message, expected] of [
    ['Użytkownik z podanym adresem e-mail już istnieje.', 'Użytkownik z podanym adresem e-mail już istnieje.'],
    ['Database connection failed.', 'Nie udało się utworzyć konta.'],
  ]) {
    const fetchMock = respondWith({ message }, 409);
    await assert.rejects(() => register(registration), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(getAuthErrorMessage(error, 'Nie udało się utworzyć konta.'), expected);
      return true;
    });
    fetchMock.mock.restore();
  }
});

test('does not assign an HTTP status to a network failure', async () => {
  const networkError = new TypeError('Failed to fetch');
  mock.method(globalThis, 'fetch', async () => { throw networkError; });

  await assert.rejects(getServices, (error: unknown) => error === networkError);
});
