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
  servicesError: string;
  bookingsError: string;
  onRetryServices: () => void;
  onRetryBookings: () => void;
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
  availableDatesError: string;
  availableSlotsError: string;
  onRetryAvailableDates: () => void;
  onRetryAvailableSlots: () => void;
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
  servicesError,
  bookingsError,
  onRetryServices,
  onRetryBookings,
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
  availableDatesError,
  availableSlotsError,
  onRetryAvailableDates,
  onRetryAvailableSlots,
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

          <ServiceList services={services} loading={loadingServices} error={servicesError} onRetry={onRetryServices} />
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
            availableDatesError={availableDatesError}
            availableSlotsError={availableSlotsError}
            onRetryAvailableDates={onRetryAvailableDates}
            onRetryAvailableSlots={onRetryAvailableSlots}
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
          <h2>Moje rezerwacje</h2>
          <p>Twoje rezerwacje zapisane w systemie.</p>
        </div>

        <BookingList bookings={bookings} services={services} loading={loadingBookings} error={bookingsError} onRetry={onRetryBookings} />
      </section>
    </>
  );
}

export default ClientDashboard;
