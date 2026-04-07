import type { Booking, FormErrors } from '../types/booking';
import type { Service } from '../types/service';
import BookingForm from './BookingForm';
import BookingList from './BookingList';
import ServiceList from './ServiceList';

type ClientDashboardProps = {
  services: Service[];
  bookings: Booking[];
  loadingServices: boolean;
  loadingBookings: boolean;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  selectedDate: string;
  selectedTime: string;
  displayedMonth: Date;
  availableDates: string[];
  availableSlots: string[];
  loadingAvailableDates: boolean;
  loadingAvailableSlots: boolean;
  formErrors: FormErrors;
  submitting: boolean;
  onServiceIdChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerEmailChange: (value: string) => void;
  onDisplayedMonthChange: (value: Date) => void;
  onSelectedDateChange: (value: string) => void;
  onSelectedTimeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function ClientDashboard({
  services,
  bookings,
  loadingServices,
  loadingBookings,
  serviceId,
  customerName,
  customerEmail,
  selectedDate,
  selectedTime,
  displayedMonth,
  availableDates,
  availableSlots,
  loadingAvailableDates,
  loadingAvailableSlots,
  formErrors,
  submitting,
  onServiceIdChange,
  onCustomerNameChange,
  onCustomerEmailChange,
  onDisplayedMonthChange,
  onSelectedDateChange,
  onSelectedTimeChange,
  onSubmit,
}: ClientDashboardProps) {
  return (
    <>
      <div className="content-grid">
        <section className="card">
          <div className="section-heading">
            <h2>Dostępne usługi</h2>
            <p>Lista usług, które możesz zarezerwować.</p>
          </div>

          <ServiceList services={services} loading={loadingServices} />
        </section>

        <section className="card">
          <div className="section-heading">
            <h2>Nowa rezerwacja</h2>
            <p>Wybierz usługę, dzień i godzinę.</p>
          </div>

          <BookingForm
            services={services}
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
            onServiceIdChange={onServiceIdChange}
            onCustomerNameChange={onCustomerNameChange}
            onCustomerEmailChange={onCustomerEmailChange}
            onDisplayedMonthChange={onDisplayedMonthChange}
            onSelectedDateChange={onSelectedDateChange}
            onSelectedTimeChange={onSelectedTimeChange}
            onSubmit={onSubmit}
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
    </>
  );
}

export default ClientDashboard;