type AvailabilityPickerProps = {
  month: Date;
  selectedDate: string;
  selectedTime: string;
  availableDates: string[];
  availableSlots: string[];
  loadingAvailableDates: boolean;
  loadingAvailableSlots: boolean;
  error?: string;
  onMonthChange: (nextMonth: Date) => void;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
};

const weekdayLabels = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSelectedDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function buildCalendarDays(month: Date) {
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayBasedIndex = (firstDayOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - mondayBasedIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);

    return {
      date: day,
      iso: toIsoDate(day),
      isCurrentMonth: day.getMonth() === month.getMonth(),
    };
  });
}

function AvailabilityPicker({
  month,
  selectedDate,
  selectedTime,
  availableDates,
  availableSlots,
  loadingAvailableDates,
  loadingAvailableSlots,
  error,
  onMonthChange,
  onDateSelect,
  onTimeSelect,
}: AvailabilityPickerProps) {
  const calendarDays = buildCalendarDays(month);
  const availableDateSet = new Set(availableDates);
  const todayIso = toIsoDate(new Date());

  return (
    <div className="availability-picker">
      <div className="availability-calendar">
        <div className="availability-calendar__header">
          <button
            type="button"
            className="calendar-nav-button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ‹
          </button>

          <div className="availability-calendar__title">{formatMonthLabel(month)}</div>

          <button
            type="button"
            className="calendar-nav-button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="availability-calendar__weekdays">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="availability-calendar__grid">
          {calendarDays.map((day) => {
            const isPast = day.iso < todayIso;
            const isAvailable = day.isCurrentMonth && availableDateSet.has(day.iso);
            const isSelected = selectedDate === day.iso;
            const isDisabled = !day.isCurrentMonth || isPast || !isAvailable;

            return (
              <button
                key={day.iso}
                type="button"
                className={[
                  'calendar-day',
                  day.isCurrentMonth ? '' : 'calendar-day--outside',
                  isAvailable ? 'calendar-day--available' : '',
                  isSelected ? 'calendar-day--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={isDisabled}
                onClick={() => onDateSelect(day.iso)}
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>

        {loadingAvailableDates && (
          <p className="availability-helper">Ładowanie dostępnych dni...</p>
        )}

        {!loadingAvailableDates && (
          <p className="availability-helper">
            Aktywne są tylko dni, w których są wolne terminy.
          </p>
        )}
      </div>

      <div className="availability-slots">
        <div className="availability-slots__header">
          <h3>Dostępne godziny</h3>
          {selectedDate && <p>{formatSelectedDate(selectedDate)}</p>}
        </div>

        {!selectedDate && <p className="availability-empty">Najpierw wybierz dzień.</p>}

        {selectedDate && loadingAvailableSlots && (
          <p className="availability-empty">Ładowanie godzin...</p>
        )}

        {selectedDate && !loadingAvailableSlots && availableSlots.length === 0 && (
          <p className="availability-empty">Brak wolnych godzin dla tego dnia.</p>
        )}

        {selectedDate && !loadingAvailableSlots && availableSlots.length > 0 && (
          <div className="availability-slots__grid">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                className={[
                  'slot-button',
                  selectedTime === slot ? 'slot-button--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onTimeSelect(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        )}

        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}

export default AvailabilityPicker;