import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AuthScreen from './components/AuthScreen';
import ClientDashboard from './components/ClientDashboard';
import Message from './components/Message';
import ProviderDashboard from './components/ProviderDashboard';
import {
  clearToken,
  createBooking,
  createService,
  getAvailability,
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
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingAvailableDates, setLoadingAvailableDates] = useState(false);
  const [loadingAvailableSlots, setLoadingAvailableSlots] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const bookingDate = useMemo(() => {
    if (!selectedDate || !selectedTime) {
      return '';
    }

    return `${selectedDate}T${selectedTime}:00`;
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setErrorMessage('');
        setLoadingServices(true);
        setLoadingBookings(true);

        const [servicesData, bookingsData] = await Promise.all([getServices(), getBookings()]);

        setServices(servicesData);
        setBookings(bookingsData);

        if (servicesData.length > 0) {
          setServiceId((currentValue) => currentValue || String(servicesData[0].id));
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
      } finally {
        setLoadingServices(false);
        setLoadingBookings(false);
      }
    };

    void loadData();
  }, []);

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
    if (!serviceId) {
      setAvailableDates([]);
      return;
    }

    let cancelled = false;

    const loadMonthAvailability = async () => {
      try {
        setLoadingAvailableDates(true);

        const monthDates = getMonthDates(displayedMonth);

        const results = await Promise.all(
          monthDates.map(async (date) => {
            try {
              return await getAvailability(Number(serviceId), date);
            } catch {
              return { date, slots: [] };
            }
          }),
        );

        if (cancelled) {
          return;
        }

        const nextAvailableDates = results
          .filter((item) => item.slots.length > 0)
          .map((item) => item.date);

        setAvailableDates(nextAvailableDates);

        if (
          selectedDate &&
          isSameMonth(selectedDate, displayedMonth) &&
          !nextAvailableDates.includes(selectedDate)
        ) {
          setSelectedDate('');
          setSelectedTime('');
          setAvailableSlots([]);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Nie udało się pobrać dostępnych dni.',
          );
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
  }, [serviceId, displayedMonth, selectedDate]);

  useEffect(() => {
    if (!serviceId || !selectedDate) {
      setAvailableSlots([]);
      setSelectedTime('');
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        setLoadingAvailableSlots(true);

        const availability = await getAvailability(Number(serviceId), selectedDate);

        if (cancelled) {
          return;
        }

        setAvailableSlots(availability.slots);

        if (selectedTime && !availability.slots.includes(selectedTime)) {
          setSelectedTime('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Nie udało się pobrać dostępnych godzin.',
          );
          setAvailableSlots([]);
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
  }, [serviceId, selectedDate, selectedTime]);

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const bookingsData = await getBookings();
      setBookings(bookingsData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się pobrać rezerwacji.');
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const servicesData = await getServices();
      setServices(servicesData);

      if (servicesData.length > 0) {
        setServiceId((currentValue) => currentValue || String(servicesData[0].id));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się pobrać usług.');
    } finally {
      setLoadingServices(false);
    }
  };

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
    setAvailableSlots([]);
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
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się zalogować.');
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
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się utworzyć konta.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
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

      await createService(payload);
      await loadServices();

      setSuccessMessage('Usługa została dodana.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się dodać usługi.');
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
      resetForm();
      await loadBookings();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        {errorMessage && <Message type="error">{errorMessage}</Message>}
        {successMessage && <Message type="success">{successMessage}</Message>}

        {!authUser ? (
          <AuthScreen
            loading={authLoading}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        ) : (
          <>
            <header className="hero">
              <div className="hero__content hero__content--row">
                <h1>Booking Platform</h1>

                <div className="auth-user-box">
                  <span>{authUser.email}</span>
                  <span className="auth-user-box__role">
                    {authUser.accountType === 'provider' ? 'Usługodawca' : 'Klient'}
                  </span>
                  <button type="button" onClick={handleLogout}>
                    Wyloguj
                  </button>
                </div>
              </div>
            </header>

            {authUser.accountType === 'client' ? (
              <ClientDashboard
                services={services}
                bookings={bookings}
                loadingServices={loadingServices}
                loadingBookings={loadingBookings}
                serviceId={serviceId}
                customerName={customerName}
                customerEmail={customerEmail}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                displayedMonth={displayedMonth}
                availableDates={availableDates}
                availableSlots={availableSlots}
                loadingAvailableDates={loadingAvailableDates}
                loadingAvailableSlots={loadingAvailableSlots}
                formErrors={formErrors}
                submitting={submitting}
                onServiceIdChange={(value) => {
                  setServiceId(value);
                  setSelectedDate('');
                  setSelectedTime('');
                  setAvailableSlots([]);
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
                providerSubmitting={providerSubmitting}
                onSubmit={handleProviderServiceCreate}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;