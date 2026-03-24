import { formatDateTime } from '../lib/format';
import type { Booking } from '../types/booking';
import type { Service } from '../types/service';

type BookingListProps = {
  bookings: Booking[];
  services: Service[];
  loading: boolean;
};

function BookingList({ bookings, services, loading }: BookingListProps) {
  const getServiceName = (serviceId: number): string => {
    const service = services.find((item) => item.id === serviceId);
    return service ? service.name : `Usługa #${serviceId}`;
  };

  if (loading) {
    return <p>Ładowanie rezerwacji...</p>;
  }

  if (bookings.length === 0) {
    return <p>Brak rezerwacji.</p>;
  }

  return (
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
  );
}

export default BookingList;