import AvailabilityPicker from './AvailabilityPicker';
import type { FormErrors } from '../types/booking';
import type { Service } from '../types/service';

type BookingFormProps = {
  services: Service[];
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

function BookingForm({
  services,
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

      <div className="booking-form__availability">
        <span className="booking-form__section-label">Termin rezerwacji</span>

        <AvailabilityPicker
          month={displayedMonth}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          availableDates={availableDates}
          availableSlots={availableSlots}
          loadingAvailableDates={loadingAvailableDates}
          loadingAvailableSlots={loadingAvailableSlots}
          error={formErrors.bookingDate}
          onMonthChange={onDisplayedMonthChange}
          onDateSelect={onSelectedDateChange}
          onTimeSelect={onSelectedTimeChange}
        />
      </div>

      <button type="submit" disabled={submitting} className="booking-form__submit">
        {submitting ? 'Zapisywanie...' : 'Utwórz rezerwację'}
      </button>
    </form>
  );
}

export default BookingForm;