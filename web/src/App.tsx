import { useEffect, useState } from 'react';
import './App.css';

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  createdAt: string;
};

type Booking = {
  id: number;
  serviceId: number;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  createdAt: string;
};

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch(`${API_BASE_URL}/services`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać usług.');
      }

      const data: Service[] = await response.json();
      setServices(data);

      if (data.length > 0 && serviceId === '') {
        setServiceId(String(data[0].id));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await fetch(`${API_BASE_URL}/bookings`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać rezerwacji.');
      }

      const data: Booking[] = await response.json();
      setBookings(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    void fetchServices();
    void fetchBookings();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!serviceId || !customerName || !customerEmail || !bookingDate) {
      setErrorMessage('Uzupełnij wszystkie pola formularza.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: Number(serviceId),
          customerName,
          customerEmail,
          bookingDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'Nie udało się utworzyć rezerwacji.');
      }

      setSuccessMessage('Rezerwacja została utworzona.');
      setCustomerName('');
      setCustomerEmail('');
      setBookingDate('');

      await fetchBookings();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił nieznany błąd.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>BookingPlatform</h1>
          <p>Frontend połączony z API Symfony</p>
        </header>

        {errorMessage && <div className="message error">{errorMessage}</div>}
        {successMessage && <div className="message success">{successMessage}</div>}

        <section className="card">
          <h2>Dostępne usługi</h2>

          {loadingServices ? (
            <p>Ładowanie usług...</p>
          ) : services.length === 0 ? (
            <p>Brak usług do wyświetlenia.</p>
          ) : (
            <div className="services-list">
              {services.map((service) => (
                <div key={service.id} className="service-item">
                  <h3>{service.name}</h3>
                  <p>Cena: {service.price} PLN</p>
                  <p>Czas trwania: {service.durationMinutes} min</p>
                  <p>{service.description ?? 'Brak opisu'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Nowa rezerwacja</h2>

          <form onSubmit={handleSubmit} className="booking-form">
            <label>
              Usługa
              <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">Wybierz usługę</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Imię i nazwisko
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Np. Anna Nowak"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="Np. anna@example.com"
              />
            </label>

            <label>
              Termin rezerwacji
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
              />
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Zapisywanie...' : 'Utwórz rezerwację'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Lista rezerwacji</h2>

          {loadingBookings ? (
            <p>Ładowanie rezerwacji...</p>
          ) : bookings.length === 0 ? (
            <p>Brak rezerwacji.</p>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-item">
                  <h3>Rezerwacja #{booking.id}</h3>
                  <p>Service ID: {booking.serviceId}</p>
                  <p>Klient: {booking.customerName}</p>
                  <p>Email: {booking.customerEmail}</p>
                  <p>Termin: {booking.bookingDate}</p>
                  <p>Utworzono: {booking.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;