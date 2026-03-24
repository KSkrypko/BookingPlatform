import type { FormErrors } from '../types/booking';
import type { Service } from '../types/service';

type BookingFormProps = {
  services: Service[];
  serviceId: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  formErrors: FormErrors;
  submitting: boolean;
  onServiceIdChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerEmailChange: (value: string) => void;
  onBookingDateChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function BookingForm({
  services,
  serviceId,
  customerName,
  customerEmail,
  bookingDate,
  formErrors,
  submitting,
  onServiceIdChange,
  onCustomerNameChange,
  onCustomerEmailChange,
  onBookingDateChange,
  onSubmit,
}: BookingFormProps) {
  return (
    <form onSubmit={onSubmit} className="booking-form" noValidate>
      <label>
        Usługa
        <select
          value={serviceId}
          onChange={(event) => onServiceIdChange(event.target.value)}
          className={formErrors.serviceId ? 'input-error' : ''}
        >
          <option value="">Wybierz usługę</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        {formErrors.serviceId && <span className="field-error">{formErrors.serviceId}</span>}
      </label>

      <label>
        Imię i nazwisko
        <input
          type="text"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
          placeholder="Np. Jan Kowalski"
          className={formErrors.customerName ? 'input-error' : ''}
        />
        {formErrors.customerName && <span className="field-error">{formErrors.customerName}</span>}
      </label>

      <label>
        Email
        <input
          type="email"
          value={customerEmail}
          onChange={(event) => onCustomerEmailChange(event.target.value)}
          placeholder="Np. jan.kowalski@example.com"
          className={formErrors.customerEmail ? 'input-error' : ''}
        />
        {formErrors.customerEmail && <span className="field-error">{formErrors.customerEmail}</span>}
      </label>

      <label>
        Termin rezerwacji
        <input
          type="datetime-local"
          value={bookingDate}
          onChange={(event) => onBookingDateChange(event.target.value)}
          className={formErrors.bookingDate ? 'input-error' : ''}
        />
        {formErrors.bookingDate && <span className="field-error">{formErrors.bookingDate}</span>}
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Zapisywanie...' : 'Utwórz rezerwację'}
      </button>
    </form>
  );
}

export default BookingForm;