import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { createAvailabilityLoader } from '../src/lib/availability';

const service = {
  id: 1, name: 'Konsultacja', description: null, price: '150.00',
  durationMinutes: 60, createdAt: '2026-11-01T09:00:00+01:00',
};
const today = '2026-11-04';
const monthDates = Array.from({ length: 27 }, (_, index) => `2026-11-${String(index + 4).padStart(2, '0')}`);

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function mockApi(accountType: 'client' | 'provider' = 'client') {
  const api = {
    requests: [] as { serviceId: number; date: string }[],
    booked: false,
    availability: async (...[, date]: [number, string]): Promise<Response> =>
      response({ date, slots: ['09:00', '10:00'] }),
  };
  localStorage.setItem('booking_platform_token', 'token');
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    switch (url.pathname) {
      case '/api/me': return response({ id: 1, email: 'jan@example.com', roles: ['ROLE_USER'], accountType });
      case '/api/services': return response([service, { ...service, id: 2, name: 'Masaż' }]);
      case '/api/bookings':
        if (init?.method !== 'POST') return response([]);
        api.booked = true;
        return response({
          id: 1, serviceId: 1, customerName: 'Jan Kowalski', customerEmail: 'jan@example.com',
          bookingDate: `${today}T09:00:00+01:00`, createdAt: `${today}T08:00:00+01:00`,
        });
      case '/api/availability': {
        const serviceId = Number(url.searchParams.get('serviceId'));
        const date = url.searchParams.get('date')!;
        api.requests.push({ serviceId, date });
        return api.availability(serviceId, date);
      }
      default: throw new Error(`Unexpected request: ${url.pathname}`);
    }
  }));
  return api;
}

async function ready() {
  await screen.findByText('Aktywne są tylko dni, w których są wolne terminy.');
}

function navigate(direction: '‹' | '›') {
  fireEvent.click(screen.getByRole('button', { name: direction }));
}

async function selectDay(day = '4') {
  let button: HTMLButtonElement | undefined;
  await waitFor(() => {
    button = screen.getAllByRole<HTMLButtonElement>('button', { name: day }).find((item) => !item.disabled);
    expect(button).toBeDefined();
  });
  fireEvent.click(button!);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${today}T12:00:00+01:00`));
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('availability request counts', () => {
  it.each([false, true])('loads only remaining dates, with one GET per date (StrictMode: %s)', async (strict) => {
    const api = mockApi();
    render(strict ? <StrictMode><App /></StrictMode> : <App />);
    await ready();
    expect(api.requests).toEqual(monthDates.map((date) => ({ serviceId: 1, date })));
  });

  it.each(['anonymous', 'provider'] as const)('does not fetch availability behind the %s screen', async (role) => {
    const api = mockApi('provider');
    if (role === 'anonymous') localStorage.clear();
    render(<App />);
    if (role === 'provider') await screen.findByText('Panel usługodawcy');
    else await screen.findByRole('heading', { name: 'Zaloguj się' });
    await act(async () => {});
    expect(api.requests).toHaveLength(0);
  });

  it('reuses monthly results when choosing days or times, editing fields, and rerendering', async () => {
    const api = mockApi();
    const view = render(<App />);
    await ready();
    await selectDay();
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Imię i nazwisko' }), { target: { value: 'Jan Kowalski' } });
    fireEvent.click(screen.getByRole('button', { name: '10:00' }));
    await selectDay('5');
    await screen.findByRole('button', { name: '09:00' });
    view.rerender(<App />);
    await act(async () => {});
    expect(api.requests).toHaveLength(27);
  });

  it('fetches the next month once, reuses a recent previous month, and skips entirely past months', async () => {
    const api = mockApi();
    render(<App />);
    await ready();
    navigate('›');
    await ready();
    expect(api.requests.slice(27)).toEqual(Array.from({ length: 31 }, (_, index) => ({
      serviceId: 1, date: `2026-12-${String(index + 1).padStart(2, '0')}`,
    })));
    navigate('‹');
    await ready();
    expect(api.requests).toHaveLength(58);
    navigate('‹');
    await screen.findByText('Brak wolnych dni w tym miesiącu.');
    expect(api.requests).toHaveLength(58);
  });

  it('keeps service caches separate and reuses a recent service when switching back', async () => {
    const api = mockApi();
    render(<App />);
    await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '2' } });
    await ready();
    expect(api.requests.slice(27)).toEqual(monthDates.map((date) => ({ serviceId: 2, date })));
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '1' } });
    await ready();
    expect(api.requests).toHaveLength(54);
  });

  it('refetches a selected day after the short cache lifetime without refetching the month', async () => {
    const api = mockApi();
    render(<App />);
    await ready();
    vi.setSystemTime(new Date(`${today}T12:00:31+01:00`));
    await selectDay();
    await screen.findByRole('button', { name: '09:00' });
    expect(api.requests.slice(27)).toEqual([{ serviceId: 1, date: today }]);
  });

  it('deduplicates a still-pending month when navigating away and back', async () => {
    const api = mockApi();
    const pending = deferred<void>();
    api.availability = async (...[, date]) => {
      if (date.startsWith('2026-11')) await pending.promise;
      return response({ date, slots: ['09:00'] });
    };
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText('Ładowanie dostępnych dni...');
    navigate('›');
    await ready();
    navigate('‹');
    await screen.findByText('Ładowanie dostępnych dni...');
    expect(api.requests.filter((item) => item.date.startsWith('2026-11'))).toHaveLength(27);
    await act(async () => { pending.resolve(); });
    await ready();
    expect(api.requests).toHaveLength(58);
  });
});

describe('availability failures and stale responses', () => {
  it.each(['http', 'network'] as const)('reports a rejected %s batch and retries with fresh requests', async (failure) => {
    const api = mockApi();
    api.availability = async (...[, date]) => {
      if (failure === 'network') throw new TypeError('Failed to fetch');
      return response({ date, slots: [] }, 500);
    };
    render(<App />);
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(screen.queryByText('Brak wolnych dni w tym miesiącu.')).toBeNull();
    api.availability = async (...[, date]) => response({ date, slots: ['09:00'] });
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie dni' }));
    await ready();
    expect(api.requests).toHaveLength(54);
  });

  it.each(['resolve', 'reject'] as const)('ignores a late %s from the previously selected service', async (settlement) => {
    const api = mockApi();
    const old = deferred<void>();
    api.availability = async (id, date) => {
      if (id === 1) await old.promise;
      return response({ date, slots: id === 1 ? ['09:00'] : ['11:00'] });
    };
    render(<App />);
    await screen.findByText('Ładowanie dostępnych dni...');
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '2' } });
    await ready();
    await selectDay();
    await screen.findByRole('button', { name: '11:00' });
    await act(async () => {
      if (settlement === 'resolve') old.resolve();
      else old.reject(new TypeError('Late failure'));
    });
    expect(screen.getByRole('button', { name: '11:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not let an old month response overwrite the currently displayed month', async () => {
    const api = mockApi();
    const old = deferred<void>();
    api.availability = async (...[, date]) => {
      if (date.startsWith('2026-11')) await old.promise;
      return response({ date, slots: date.startsWith('2026-12') ? [] : ['09:00'] });
    };
    render(<App />);
    await screen.findByText('Ładowanie dostępnych dni...');
    navigate('›');
    await screen.findByText('Brak wolnych dni w tym miesiącu.');
    await act(async () => { old.resolve(); });
    expect(screen.getByText('Brak wolnych dni w tym miesiącu.')).toBeTruthy();
    expect(document.querySelectorAll('.calendar-day--available')).toHaveLength(0);
  });

  it('does not let an old selected-day response overwrite a newer date', async () => {
    const api = mockApi();
    render(<App />);
    await ready();
    vi.setSystemTime(new Date(`${today}T12:00:31+01:00`));
    const old = deferred<void>();
    api.availability = async (...[, date]) => {
      if (date === today) await old.promise;
      return response({ date, slots: date === today ? ['09:00'] : ['11:00'] });
    };
    await selectDay();
    await screen.findByText('Ładowanie godzin...');
    await selectDay('5');
    await screen.findByRole('button', { name: '11:00' });
    await act(async () => { old.resolve(); });
    expect(screen.getByRole('button', { name: '11:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
  });
});

describe('availability after booking', () => {
  it('retains known dates if the post-booking refresh fails and recovers through the existing retry', async () => {
    const api = mockApi();
    api.availability = async (...[, date]) => {
      if (api.booked) throw new TypeError('Failed to fetch');
      return response({ date, slots: ['09:00'] });
    };
    render(<App />);
    await ready();
    await selectDay();
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Imię i nazwisko' }), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'jan@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz rezerwację' }));
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(screen.getByText('Rezerwacja została utworzona.')).toBeTruthy();
    expect(document.querySelectorAll('.calendar-day--available')).toHaveLength(27);
    expect(screen.queryByText('Brak wolnych dni w tym miesiącu.')).toBeNull();
    expect(api.requests).toHaveLength(54);
    api.availability = async (...[, date]) => response({ date, slots: ['10:00'] });
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie dni' }));
    await ready();
    await selectDay();
    await screen.findByRole('button', { name: '10:00' });
    expect(api.requests).toHaveLength(81);
  });

  it('invalidates every service cache and refreshes the month after a confirmed booking', async () => {
    const api = mockApi();
    api.availability = async (...[, date]) => response({ date, slots: api.booked ? ['10:00'] : ['09:00', '10:00'] });
    render(<App />);
    await ready();
    // Populate another service, too: its provider may share the same calendar.
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '2' } });
    await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '1' } });
    await ready();
    await selectDay();
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Imię i nazwisko' }), { target: { value: 'Jan Kowalski' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'jan@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz rezerwację' }));
    await screen.findByText('Rezerwacja została utworzona.');
    await ready();
    expect(api.requests).toHaveLength(81);
    await selectDay();
    await screen.findByRole('button', { name: '10:00' });
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
    expect(api.requests).toHaveLength(81);
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '2' } });
    await ready();
    expect(api.requests).toHaveLength(108);
  });
});

describe('shared daily requests', () => {
  it('invalidates a retried day without discarding other services or dates', async () => {
    const api = mockApi();
    const loader = createAvailabilityLoader();
    await Promise.all([loader.get(1, today), loader.get(1, '2026-11-05'), loader.get(2, today)]);
    loader.invalidate(1, today);
    await Promise.all([loader.get(1, today), loader.get(1, '2026-11-05'), loader.get(2, today)]);
    expect(api.requests).toEqual([
      { serviceId: 1, date: today }, { serviceId: 1, date: '2026-11-05' },
      { serviceId: 2, date: today }, { serviceId: 1, date: today },
    ]);
  });

  it('does not reuse a pending request invalidated by a mutation, or let its settlement remove a newer one', async () => {
    mockApi();
    const old = deferred<Response>();
    const current = deferred<Response>();
    const fetchMock = vi.mocked(fetch).mockReset();
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const loader = createAvailabilityLoader();
    const first = loader.get(1, today);
    loader.invalidate();
    const next = loader.get(1, today);
    old.reject(new TypeError('Old request failed'));
    await expect(first).rejects.toThrow('Old request failed');
    expect(loader.get(1, today)).toBe(next);
    current.resolve(response({ date: today, slots: ['10:00'] }));
    await expect(next).resolves.toEqual({ date: today, slots: ['10:00'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
