import { formatDateTime } from '../lib/format';
import type { Booking } from '../types/booking';
import type { Service } from '../types/service';
import RequestError from './RequestError';

type BookingListProps = {
  bookings: Booking[];
  services: Service[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function BookingList({ bookings, services, loading, error, onRetry }: BookingListProps) {
  const getServiceName = (serviceId: number): string => {
    const service = services.find((item) => item.id === serviceId);
    return service ? service.name : `Usługa #${serviceId}`;
  };

  return (
    <>
      {error && (
        <RequestError
          message={error}
          loading={loading}
          retryLabel="Ponów pobieranie rezerwacji"
          hasPreviousData={bookings.length > 0}
          onRetry={onRetry}
        />
      )}
      {loading && <p role="status">Ładowanie rezerwacji...</p>}
      {!loading && !error && bookings.length === 0 && <p>Brak rezerwacji.</p>}
      {bookings.length > 0 && (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <article key={booking.id} className="booking-item">
              <div className="booking-item__header">
                <h3>Rezerwacja #{booking.id}</h3>
                <span className="booking-service">{getServiceName(booking.serviceId)}</span>
              </div>

              <dl className="booking-meta">
                <div>
                  <dt>Klient</dt>
                  <dd>{booking.customerName}</dd>
                </div>

                <div>
                  <dt>Email</dt>
                  <dd>{booking.customerEmail}</dd>
                </div>

                <div>
                  <dt>Termin</dt>
                  <dd>{formatDateTime(booking.bookingDate)}</dd>
                </div>

                <div>
                  <dt>Utworzono</dt>
                  <dd>{formatDateTime(booking.createdAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default BookingList;
