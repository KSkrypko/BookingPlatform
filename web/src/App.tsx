import { useEffect, useState } from 'react';
import './App.css';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import Message from './components/Message';
import ServiceList from './components/ServiceList';
import { createBooking, getBookings, getServices } from './lib/api';
import type { Booking, FormErrors } from './types/booking';
import type { Service } from './types/service';

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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

    if (!bookingDate) {
      errors.bookingDate = 'Wybierz termin rezerwacji.';
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
    setBookingDate('');
    setFormErrors({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
        <header className="hero">
          <div className="hero__content">
            <h1>Booking Platform</h1>
          </div>
        </header>

        {errorMessage && <Message type="error">{errorMessage}</Message>}
        {successMessage && <Message type="success">{successMessage}</Message>}

        <div className="content-grid">
          <section className="card">
            <div className="section-heading">
              <h2>Dostępne usługi</h2>
              <p>Lista usług pobierana z API.</p>
            </div>

            <ServiceList services={services} loading={loadingServices} />
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>Nowa rezerwacja</h2>
              <p>Wypełnij formularz, aby dodać nową rezerwację.</p>
            </div>

            <BookingForm
              services={services}
              serviceId={serviceId}
              customerName={customerName}
              customerEmail={customerEmail}
              bookingDate={bookingDate}
              formErrors={formErrors}
              submitting={submitting}
              onServiceIdChange={(value) => {
                setServiceId(value);
                clearFieldError('serviceId');
              }}
              onCustomerNameChange={(value) => {
                setCustomerName(value);
                clearFieldError('customerName');
              }}
              onCustomerEmailChange={(value) => {
                setCustomerEmail(value);
                clearFieldError('customerEmail');
              }}
              onBookingDateChange={(value) => {
                setBookingDate(value);
                clearFieldError('bookingDate');
              }}
              onSubmit={handleSubmit}
            />
          </section>
        </div>

        <section className="card card--full">
          <div className="section-heading">
            <h2>Lista rezerwacji</h2>
            <p>Rezerwacje zapisane w bazie danych.</p>
          </div>

          <BookingList bookings={bookings} services={services} loading={loadingBookings} />
        </section>
      </div>
    </div>
  );
}

export default App;