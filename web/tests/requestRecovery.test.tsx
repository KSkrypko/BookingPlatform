import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { Service } from '../src/types/service';
import type { Booking } from '../src/types/booking';

const service: Service = {
  id: 1, name: 'Konsultacja', description: 'Opis konsultacji', price: '150.00',
  durationMinutes: 60, createdAt: '2026-11-01T09:00:00+01:00',
};
const newService: Service = { ...service, id: 2, name: 'Masaż', price: '180.00' };
const booking: Booking = {
  id: 1, serviceId: 1, customerName: 'Jan Kowalski', customerEmail: 'jan@example.com',
  bookingDate: '2026-11-03T09:00:00+01:00', createdAt: '2026-11-02T09:00:00+01:00',
};
type Failure = 'http' | 'network' | null;

function respond(data: unknown, failure: Failure = null): Response {
  if (failure === 'network') throw new TypeError('Failed to fetch');
  return new Response(JSON.stringify(failure ? { message: 'Internal server error' } : data), {
    status: failure ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockApi(accountType: 'client' | 'provider' = 'client') {
  const api = {
    services: [service], bookings: [] as Booking[], slots: ['09:00', '10:00'],
    servicesFailure: null as Failure, bookingsFailure: null as Failure,
    createServiceFailure: null as Failure,
    availabilityFailure: (() => null) as (url: URL) => Failure,
    servicesRequests: 0, serviceCreations: 0, bookingRequests: 0,
    delayServices: null as Promise<void> | null,
    delayCreateService: null as Promise<void> | null,
    delayAvailability: null as Promise<void> | null,
  };
  window.localStorage.setItem('booking_platform_token', 'test-token');
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    switch (url.pathname) {
      case '/api/me':
        return respond({ id: 1, email: 'test@example.com', roles: ['ROLE_USER'], accountType });
      case '/api/services':
        if (init?.method === 'POST') {
          api.serviceCreations++;
          if (api.delayCreateService) await api.delayCreateService;
          const response = respond(newService, api.createServiceFailure);
          if (!api.createServiceFailure) api.services = [...api.services, newService];
          return response;
        }
        api.servicesRequests++;
        if (api.delayServices) await api.delayServices;
        return respond(api.services, api.servicesFailure);
      case '/api/bookings':
        if (init?.method === 'POST') {
          const created = { ...booking, id: 2 };
          api.bookings = [...api.bookings, created];
          return respond(created);
        }
        api.bookingRequests++;
        return respond(api.bookings, api.bookingsFailure);
      case '/api/availability': {
        if (api.delayAvailability) await api.delayAvailability;
        const date = url.searchParams.get('date')!;
        return respond({ date, slots: ['2026-11-03', '2026-11-04'].includes(date) ? api.slots : [] }, api.availabilityFailure(url));
      }
      default: throw new Error(`Unexpected request: ${url.pathname}`);
    }
  }));
  return api;
}

async function openApp() {
  render(<App />);
  await screen.findByRole('button', { name: 'Wyloguj' });
}

async function chooseDay(day = '3') {
  let button: HTMLButtonElement | undefined;
  await waitFor(() => {
    button = screen.getAllByRole<HTMLButtonElement>('button', { name: day }).find((item) => !item.disabled);
    expect(button).toBeDefined();
  });
  fireEvent.click(button!);
}

function fillServiceForm() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Nazwa usługi' }), { target: { value: 'Masaż' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Opis' }), { target: { value: 'Zachowaj opis' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Cena' }), { target: { value: '180.00' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Czas trwania' }), { target: { value: '45' } });
}

function expectServiceValues(retained: boolean) {
  expect((screen.getByRole('textbox', { name: 'Nazwa usługi' }) as HTMLInputElement).value).toBe(retained ? 'Masaż' : '');
  expect((screen.getByRole('textbox', { name: 'Opis' }) as HTMLTextAreaElement).value).toBe(retained ? 'Zachowaj opis' : '');
  expect((screen.getByRole('textbox', { name: 'Cena' }) as HTMLInputElement).value).toBe(retained ? '180.00' : '');
  expect((screen.getByRole('spinbutton', { name: 'Czas trwania' }) as HTMLInputElement).value).toBe(retained ? '45' : '60');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T12:00:00+01:00'));
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('service creation', () => {
  it('keeps values until creation is confirmed and leaves the next draft intact if the later refresh fails', async () => {
    const api = mockApi('provider');
    await openApp();
    await screen.findByRole('heading', { name: 'Konsultacja' });
    let confirmCreation!: () => void;
    let finishRefresh!: () => void;
    api.delayCreateService = new Promise<void>((resolve) => { confirmCreation = resolve; });
    api.delayServices = new Promise<void>((resolve) => { finishRefresh = resolve; });
    api.servicesFailure = 'network';
    fillServiceForm();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj usługę' }));
    await screen.findByRole('button', { name: 'Zapisywanie...' });
    expectServiceValues(true);
    expect(api.servicesRequests).toBe(1);

    await act(async () => { confirmCreation(); });
    await screen.findByText('Usługa została dodana.');
    expectServiceValues(false);
    fillServiceForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nazwa usługi' }), { target: { value: 'Kolejna usługa' } });
    await act(async () => { finishRefresh(); });
    await screen.findByText('Nie udało się odświeżyć katalogu usług. Spróbuj ponownie.');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Nazwa usługi' }).value).toBe('Kolejna usługa');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Cena' }).value).toBe('180.00');
    expect(api.serviceCreations).toBe(1);
  });

  it.each(['http', 'network'] as const)('keeps every input after a rejected %s request and clears them after a successful retry', async (failure) => {
    const api = mockApi('provider');
    api.createServiceFailure = failure;
    await openApp();
    fillServiceForm();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj usługę' }));
    await screen.findByText('Nie udało się dodać usługi. Dane formularza zostały zachowane. Spróbuj ponownie.');
    expectServiceValues(true);
    expect(api.serviceCreations).toBe(1);
    expect(api.servicesRequests).toBe(1);
    expect(screen.queryByText('Usługa została dodana.')).toBeNull();

    api.createServiceFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj usługę' }));
    await screen.findByText('Usługa została dodana.');
    expectServiceValues(false);
    expect(api.serviceCreations).toBe(2);
    expect(await screen.findByRole('heading', { name: 'Masaż' })).toBeTruthy();
  });

  it.each(['http', 'network'] as const)('retains the confirmed service when catalog refresh fails with %s; retry only refreshes the catalog', async (failure) => {
    const api = mockApi('provider');
    await openApp();
    await screen.findByRole('heading', { name: 'Konsultacja' });
    fillServiceForm();
    api.servicesFailure = failure;
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj usługę' }));
    await screen.findByText('Nie udało się odświeżyć katalogu usług. Spróbuj ponownie.');
    expect(screen.getByText('Usługa została dodana.')).toBeTruthy();
    expectServiceValues(false);
    expect(screen.getByRole('heading', { name: 'Konsultacja' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Masaż' })).toBeTruthy();
    expect(screen.getByText('Wyświetlane dane mogą być nieaktualne.')).toBeTruthy();

    let finish!: () => void;
    api.delayServices = new Promise<void>((resolve) => { finish = resolve; });
    api.servicesFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie usług' }));
    await screen.findByText('Ładowanie usług…');
    expect(screen.getByRole('heading', { name: 'Masaż' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Ponawianie…' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { finish(); });
    await waitFor(() => expect(screen.queryByText('Nie udało się odświeżyć katalogu usług. Spróbuj ponownie.')).toBeNull());
    expect(api.serviceCreations).toBe(1);
    expect(api.servicesRequests).toBe(3);
  });
});

describe('list request recovery', () => {
  it('recovers services and bookings independently without hiding another section’s failure', async () => {
    const api = mockApi();
    api.servicesFailure = 'network';
    api.bookingsFailure = 'http';
    api.bookings = [booking];
    await openApp();
    await screen.findByText('Nie udało się pobrać usług. Spróbuj ponownie.');
    await screen.findByText('Nie udało się pobrać rezerwacji. Spróbuj ponownie.');
    api.servicesFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie usług' }));
    await screen.findByRole('heading', { name: 'Konsultacja' });
    expect(screen.getByText('Nie udało się pobrać rezerwacji. Spróbuj ponownie.')).toBeTruthy();
    api.bookingsFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie rezerwacji' }));
    await screen.findByRole('heading', { name: 'Rezerwacja #1' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['http', 'network'] as const)('distinguishes failed %s service requests from successful empty results', async (failure) => {
    const api = mockApi();
    api.servicesFailure = failure;
    await openApp();
    await screen.findByText('Nie udało się pobrać usług. Spróbuj ponownie.');
    expect(screen.queryByText('Brak usług do wyświetlenia.')).toBeNull();
    api.servicesFailure = null;
    api.services = [];
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie usług' }));
    await screen.findByText('Brak usług do wyświetlenia.');
    expect(screen.queryByRole('button', { name: 'Ponów pobieranie usług' })).toBeNull();
  });

  it.each(['http', 'network'] as const)('distinguishes failed %s booking requests from successful empty results', async (failure) => {
    const api = mockApi();
    api.bookingsFailure = failure;
    await openApp();
    await screen.findByText('Nie udało się pobrać rezerwacji. Spróbuj ponownie.');
    expect(screen.queryByText('Brak rezerwacji.')).toBeNull();
    api.bookingsFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie rezerwacji' }));
    await screen.findByText('Brak rezerwacji.');
    expect(screen.queryByRole('button', { name: 'Ponów pobieranie rezerwacji' })).toBeNull();
  });

  it('keeps existing bookings when refreshing after creation fails, and retries without creating again', async () => {
    const api = mockApi();
    api.bookings = [booking];
    await openApp();
    await screen.findByRole('heading', { name: 'Rezerwacja #1' });
    await chooseDay();
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Imię i nazwisko' }), { target: { value: booking.customerName } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: booking.customerEmail } });
    api.bookingsFailure = 'network';
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Utwórz rezerwację' });
    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);
    await screen.findByText('Nie udało się pobrać rezerwacji. Spróbuj ponownie.');
    expect(screen.getByRole('heading', { name: 'Rezerwacja #1' })).toBeTruthy();
    expect(screen.queryByText('Brak rezerwacji.')).toBeNull();
    api.bookingsFailure = null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie rezerwacji' }));
    await screen.findByRole('heading', { name: 'Rezerwacja #2' });
    expect(api.bookings).toHaveLength(2);
  });
});

describe('availability recovery', () => {
  it('keeps a pending month separate from a confirmed empty month', async () => {
    const api = mockApi();
    api.slots = [];
    let finish!: () => void;
    api.delayAvailability = new Promise<void>((resolve) => { finish = resolve; });
    await openApp();
    await screen.findByText('Ładowanie dostępnych dni...');
    expect(screen.queryByText('Brak wolnych dni w tym miesiącu.')).toBeNull();
    await act(async () => { finish(); });
    await screen.findByText('Brak wolnych dni w tym miesiącu.');
  });

  it('reports a complete availability outage and restores selectable dates on retry', async () => {
    const api = mockApi();
    api.availabilityFailure = () => 'network';
    await openApp();
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(screen.queryByText('Brak wolnych dni w tym miesiącu.')).toBeNull();
    api.availabilityFailure = () => null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie dni' }));
    await chooseDay();
    await screen.findByRole('button', { name: '09:00' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['http', 'network'] as const)('shows a retry for partial %s month failures instead of treating failed days as unavailable', async (failure) => {
    const api = mockApi();
    api.availabilityFailure = (url) => url.searchParams.get('date') === '2026-11-03' ? failure : null;
    await openApp();
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(screen.queryByText('Brak wolnych dni w tym miesiącu.')).toBeNull();
    api.availabilityFailure = () => null;
    api.slots = [];
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie dni' }));
    await screen.findByText('Brak wolnych dni w tym miesiącu.');
    expect(screen.queryByRole('button', { name: 'Ponów pobieranie dni' })).toBeNull();
  });

  it('preserves known days when the selected-day request fails and retries slots independently', async () => {
    const api = mockApi();
    await openApp();
    await waitFor(() => expect(document.querySelectorAll('.calendar-day--available').length).toBe(2));
    vi.setSystemTime(new Date('2026-11-02T12:00:31+01:00'));
    api.availabilityFailure = () => 'network';
    await chooseDay();
    await screen.findByText('Nie udało się pobrać dostępnych godzin. Spróbuj ponownie.');
    expect(screen.queryByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.')).toBeNull();
    expect(document.querySelectorAll('.calendar-day--available').length).toBe(2);
    expect(screen.queryByText('Brak wolnych godzin dla tego dnia.')).toBeNull();
    api.availabilityFailure = () => null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie godzin' }));
    await screen.findByRole('button', { name: '09:00' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it.each(['http', 'network'] as const)('disables submission after a selected-day %s failure and recovers on retry', async (failure) => {
    const api = mockApi();
    await openApp();
    await screen.findByText('Aktywne są tylko dni, w których są wolne terminy.');
    vi.setSystemTime(new Date('2026-11-02T12:00:31+01:00'));
    api.availabilityFailure = () => failure;
    await chooseDay();
    await screen.findByText('Nie udało się pobrać dostępnych godzin. Spróbuj ponownie.');
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
    expect(screen.queryByText('Brak wolnych godzin dla tego dnia.')).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Utwórz rezerwację' }).disabled).toBe(true);
    api.availabilityFailure = () => null;
    fireEvent.click(screen.getByRole('button', { name: 'Ponów pobieranie godzin' }));
    const slot = await screen.findByRole<HTMLButtonElement>('button', { name: '09:00' });
    expect(slot.disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Ponów pobieranie godzin' })).toBeNull();
  });

  it('shows a genuine empty day only after a successful slots response', async () => {
    const api = mockApi();
    await openApp();
    await screen.findByText('Aktywne są tylko dni, w których są wolne terminy.');
    vi.setSystemTime(new Date('2026-11-02T12:00:31+01:00'));
    api.slots = [];
    await chooseDay();
    await screen.findByText('Brak wolnych godzin dla tego dnia.');
    expect(document.querySelectorAll('.calendar-day--available')).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not reuse slots from another date when its request fails', async () => {
    const api = mockApi();
    await openApp();
    await chooseDay();
    await screen.findByRole('button', { name: '09:00' });
    vi.setSystemTime(new Date('2026-11-02T12:00:31+01:00'));
    api.availabilityFailure = (url) => url.searchParams.get('date') === '2026-11-04' ? 'network' : null;
    await chooseDay('4');
    await screen.findByText('Nie udało się pobrać dostępnych godzin. Spróbuj ponownie.');
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
  });

  it('does not reuse availability from a different service or month after failure', async () => {
    const api = mockApi();
    api.services = [service, newService];
    await openApp();
    await chooseDay();
    await screen.findByRole('button', { name: '09:00' });
    api.availabilityFailure = () => 'network';
    fireEvent.change(screen.getByRole('combobox', { name: 'Usługa' }), { target: { value: '2' } });
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(document.querySelectorAll('.calendar-day--available').length).toBe(0);
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
    const calendar = document.querySelector('.availability-calendar') as HTMLElement;
    fireEvent.click(within(calendar).getByRole('button', { name: '›' }));
    await screen.findByText('Nie udało się pobrać dostępnych dni. Spróbuj ponownie.');
    expect(document.querySelectorAll('.calendar-day--available').length).toBe(0);
  });
});
