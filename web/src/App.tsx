import { getAuthErrorMessage } from './lib/authErrors';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AuthScreen from './components/AuthScreen';
import ClientDashboard from './components/ClientDashboard';
import Message from './components/Message';
import ProviderDashboard from './components/ProviderDashboard';
import { createAvailabilityLoader } from './lib/availability';
import {
  clearToken,
  createBooking,
  createService,
  getBookings,
  getMe,
  getServices,
  hasToken,
  login,
  register,
} from './lib/api';
import type { AccountType, AuthUser } from './types/auth';
import type { Booking, FormErrors } from './types/booking';
import type { Service } from './types/service';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthDates(month: Date): string[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    return toIsoDate(new Date(year, monthIndex, index + 1));
  });
}

function isSameMonth(dateString: string, month: Date): boolean {
  const monthPrefix = `${month.getFullYear()}-${`${month.getMonth() + 1}`.padStart(2, '0')}`;
  return dateString.startsWith(monthPrefix);
}

function App() {
  const [availabilityLoader] = useState(createAvailabilityLoader);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesVersion, setServicesVersion] = useState(0);
  const [servicesError, setServicesError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsVersion, setBookingsVersion] = useState(0);
  const [bookingsError, setBookingsError] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [monthAvailability, setMonthAvailability] = useState({ key: '', dates: [] as string[], error: '' });
  const [dayAvailability, setDayAvailability] = useState({ key: '', slots: [] as string[], error: '' });
  const [availableDatesVersion, setAvailableDatesVersion] = useState(0);
  const [availableSlotsVersion, setAvailableSlotsVersion] = useState(0);
  const [loadingAvailableDates, setLoadingAvailableDates] = useState(false);
  const [loadingAvailableSlots, setLoadingAvailableSlots] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const isClient = authUser?.accountType === 'client';
  const todayIso = toIsoDate(new Date());

  // Retain results only for the service and period they were fetched for.
  const monthAvailabilityKey = `${serviceId}:${toIsoDate(displayedMonth)}`;
  const dayAvailabilityKey = `${serviceId}:${selectedDate}`;
  const availableDates = monthAvailability.key === monthAvailabilityKey ? monthAvailability.dates : [];
  const availableDatesError = monthAvailability.key === monthAvailabilityKey ? monthAvailability.error : '';
  const availableSlots = dayAvailability.key === dayAvailabilityKey ? dayAvailability.slots : [];
  const availableSlotsError = dayAvailability.key === dayAvailabilityKey ? dayAvailability.error : '';
  const monthAvailabilityPending = Boolean(serviceId)
    && (loadingAvailableDates || monthAvailability.key !== monthAvailabilityKey);
  const dayAvailabilityPending = Boolean(serviceId && selectedDate)
    && (loadingAvailableSlots || dayAvailability.key !== dayAvailabilityKey);

  const bookingDate = useMemo(() => {
    if (!selectedDate || !selectedTime) {
      return '';
    }

    return `${selectedDate}T${selectedTime}:00`;
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadingServices(true);
        const servicesData = await getServices();

        if (cancelled) return;

        setServices(servicesData);
        setServicesError('');
        setServiceId((currentValue) => servicesData.some((service) => String(service.id) === currentValue)
          ? currentValue
          : servicesData.length > 0 ? String(servicesData[0].id) : '');
      } catch {
        if (!cancelled) {
          setServicesError(servicesVersion > 0
            ? 'Nie udało się odświeżyć katalogu usług. Spróbuj ponownie.'
            : 'Nie udało się pobrać usług. Spróbuj ponownie.');
        }
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [servicesVersion]);

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      if (!authUser || authUser.accountType !== 'client') {
        setBookings([]);
        setBookingsError('');
        setLoadingBookings(false);
        return;
      }

      try {
        setLoadingBookings(true);
        const bookingsData = await getBookings();

        if (!cancelled) {
          setBookings(bookingsData);
          setBookingsError('');
        }
      } catch {
        if (!cancelled) {
          setBookingsError('Nie udało się pobrać rezerwacji. Spróbuj ponownie.');
        }
      } finally {
        if (!cancelled) {
          setLoadingBookings(false);
        }
      }
    };

    void loadBookings();

    return () => {
      cancelled = true;
    };
  }, [authUser, bookingsVersion]);

  useEffect(() => {
    const loadMe = async () => {
      if (!hasToken()) {
        return;
      }

      try {
        const user = await getMe();
        setAuthUser(user);
      } catch {
        clearToken();
        setAuthUser(null);
      }
    };

    void loadMe();
  }, []);

  useEffect(() => {
    if (!serviceId || !isClient) {
      setLoadingAvailableDates(false);
      return;
    }

    let cancelled = false;

    const loadMonthAvailability = async () => {
      try {
        setLoadingAvailableDates(true);

        const monthDates = getMonthDates(displayedMonth).filter((date) => date >= todayIso);

        const results = await Promise.all(
          monthDates.map((date) => availabilityLoader.get(Number(serviceId), date)),
        );

        if (cancelled) {
          return;
        }

        const nextAvailableDates = results
          .filter((item) => item.slots.length > 0)
          .map((item) => item.date);

        setMonthAvailability({ key: monthAvailabilityKey, dates: nextAvailableDates, error: '' });

        setSelectedDate((current) => current && isSameMonth(current, displayedMonth)
          && !nextAvailableDates.includes(current) ? '' : current);
      } catch {
        if (!cancelled) {
          setMonthAvailability((previous) => ({
            key: monthAvailabilityKey,
            dates: previous.key === monthAvailabilityKey ? previous.dates : [],
            error: 'Nie udało się pobrać dostępnych dni. Spróbuj ponownie.',
          }));
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailableDates(false);
        }
      }
    };

    void loadMonthAvailability();

    return () => {
      cancelled = true;
    };
  }, [serviceId, displayedMonth, availableDatesVersion, monthAvailabilityKey, isClient, todayIso, availabilityLoader]);

  useEffect(() => {
    if (!serviceId || !selectedDate || !isClient) {
      setSelectedTime('');
      setLoadingAvailableSlots(false);
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        setLoadingAvailableSlots(true);

        const availability = await availabilityLoader.get(Number(serviceId), selectedDate);

        if (cancelled) {
          return;
        }

        setDayAvailability({ key: dayAvailabilityKey, slots: availability.slots, error: '' });
        // A day revalidated after cache expiry may have become fully booked.
        setMonthAvailability((previous) => {
          if (previous.key !== `${serviceId}:${selectedDate.slice(0, 7)}-01`) return previous;
          const wasAvailable = previous.dates.includes(selectedDate);
          const isAvailable = availability.slots.length > 0;
          if (wasAvailable === isAvailable) return previous;
          return {
            ...previous,
            dates: isAvailable ? [...previous.dates, selectedDate] : previous.dates.filter((date) => date !== selectedDate),
          };
        });

        setSelectedTime((current) => availability.slots.includes(current) ? current : '');
      } catch {
        if (!cancelled) {
          setDayAvailability((previous) => ({
            key: dayAvailabilityKey,
            slots: previous.key === dayAvailabilityKey ? previous.slots : [],
            error: 'Nie udało się pobrać dostępnych godzin. Spróbuj ponownie.',
          }));
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailableSlots(false);
        }
      }
    };

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [serviceId, selectedDate, availableSlotsVersion, dayAvailabilityKey, isClient, availabilityLoader]);

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    const trimmedCustomerName = customerName.trim();
    const trimmedCustomerEmail = customerEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!serviceId) {
      errors.serviceId = 'Wybierz usługę.';
    }

    if (!trimmedCustomerName) {
      errors.customerName = 'Podaj imię i nazwisko.';
    } else if (trimmedCustomerName.length < 2) {
      errors.customerName = 'Imię i nazwisko musi mieć co najmniej 2 znaki.';
    }

    if (!trimmedCustomerEmail) {
      errors.customerEmail = 'Podaj adres email.';
    } else if (!emailRegex.test(trimmedCustomerEmail)) {
      errors.customerEmail = 'Podaj poprawny adres email.';
    }

    if (!selectedDate || !selectedTime || !bookingDate) {
      errors.bookingDate = 'Wybierz dzień i godzinę rezerwacji.';
    }

    return errors;
  };

  const clearFieldError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setSelectedDate('');
    setSelectedTime('');
    setDayAvailability({ key: '', slots: [], error: '' });
    setFormErrors({});
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      await login({ email, password });
      const user = await getMe();
      setAuthUser(user);

      setSuccessMessage('Zalogowano pomyślnie.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'Nie udało się zalogować.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, accountType: AccountType) => {
    try {
      setAuthLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      await register({ email, password, accountType });

      setSuccessMessage('Konto zostało utworzone. Teraz zaloguj się.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'Nie udało się utworzyć konta.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    availabilityLoader.invalidate();
    clearToken();
    setAuthUser(null);
    setBookings([]);
    resetForm();
    setSuccessMessage('Wylogowano.');
  };

  const handleProviderServiceCreate = async (payload: {
    name: string;
    description: string | null;
    price: string;
    durationMinutes: number;
  }) => {
    try {
      setProviderSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const service = await createService(payload);
      setServices((current) => [...current, service]);
      setSuccessMessage('Usługa została dodana.');
      setServicesVersion((current) => current + 1);
      return true;
    } catch {
      setErrorMessage('Nie udało się dodać usługi. Dane formularza zostały zachowane. Spróbuj ponownie.');
      return false;
    } finally {
      setProviderSubmitting(false);
    }
  };

  const handleBookingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);

      await createBooking({
        serviceId: Number(serviceId),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        bookingDate,
      });

      setSuccessMessage('Rezerwacja została utworzona.');
      // Bookings can affect other services owned by the same provider, so clear
      // every cached service and refresh the visible month from the server.
      availabilityLoader.invalidate();
      resetForm();
      setAvailableDatesVersion((currentVersion) => currentVersion + 1);
      setBookingsVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          <div className="app-header__brand">
            <h1>Booking<span>Platform</span></h1>
            <span className="app-header__descriptor">Rezerwacje usług</span>
          </div>

          {authUser ? (
            <div className="auth-user-box">
              <div className="auth-user-box__identity">
                <span className="auth-user-box__email">{authUser.email}</span>
                <span className="auth-user-box__role">
                  {authUser.accountType === 'provider' ? 'Usługodawca' : 'Klient'}
                </span>
              </div>
              <button type="button" className="button-secondary" onClick={handleLogout}>
                Wyloguj
              </button>
            </div>
          ) : <span className="app-header__context">Twoje konto</span>}
        </header>

        {!authUser ? (
          <AuthScreen
            loading={authLoading}
            feedback={<>
              {errorMessage && <Message type="error">{errorMessage}</Message>}
              {successMessage && <Message type="success">{successMessage}</Message>}
            </>}
            onModeChange={() => {
              setErrorMessage('');
              setSuccessMessage('');
            }}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        ) : (
          <main className="dashboard">
            {errorMessage && <Message type="error">{errorMessage}</Message>}
            {successMessage && <Message type="success">{successMessage}</Message>}

            {authUser.accountType === 'client' ? (
              <ClientDashboard
                services={services}
                bookings={bookings}
                loadingServices={loadingServices}
                loadingBookings={loadingBookings}
                servicesError={servicesError}
                bookingsError={bookingsError}
                onRetryServices={() => setServicesVersion((current) => current + 1)}
                onRetryBookings={() => setBookingsVersion((current) => current + 1)}
                serviceId={serviceId}
                customerName={customerName}
                customerEmail={customerEmail}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                displayedMonth={displayedMonth}
                availableDates={availableDates}
                availableSlots={availableSlots}
                loadingAvailableDates={monthAvailabilityPending}
                loadingAvailableSlots={dayAvailabilityPending}
                availableDatesError={availableDatesError}
                availableSlotsError={availableSlotsError}
                onRetryAvailableDates={() => {
                  availabilityLoader.invalidate(Number(serviceId));
                  setAvailableDatesVersion((current) => current + 1);
                }}
                onRetryAvailableSlots={() => {
                  availabilityLoader.invalidate(Number(serviceId), selectedDate);
                  setAvailableSlotsVersion((current) => current + 1);
                }}
                formErrors={formErrors}
                submitting={submitting}
                onServiceIdChange={(value) => {
                  setServiceId(value);
                  setSelectedDate('');
                  setSelectedTime('');
                  clearFieldError('serviceId');
                  clearFieldError('bookingDate');
                }}
                onCustomerNameChange={(value) => {
                  setCustomerName(value);
                  clearFieldError('customerName');
                }}
                onCustomerEmailChange={(value) => {
                  setCustomerEmail(value);
                  clearFieldError('customerEmail');
                }}
                onDisplayedMonthChange={(value) => {
                  setDisplayedMonth(value);
                }}
                onSelectedDateChange={(value) => {
                  setSelectedDate(value);
                  setSelectedTime('');
                  clearFieldError('bookingDate');
                }}
                onSelectedTimeChange={(value) => {
                  setSelectedTime(value);
                  clearFieldError('bookingDate');
                }}
                onSubmit={handleBookingSubmit}
              />
            ) : (
              <ProviderDashboard
                services={services}
                loadingServices={loadingServices}
                servicesError={servicesError}
                onRetryServices={() => setServicesVersion((current) => current + 1)}
                providerSubmitting={providerSubmitting}
                onSubmit={handleProviderServiceCreate}
              />
            )}
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
