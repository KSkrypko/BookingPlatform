export type Booking = {
  id: number;
  serviceId: number;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  createdAt: string;
};

export type AvailabilityDay = {
  date: string;
  slots: string[];
};

export type FormErrors = {
  serviceId?: string;
  customerName?: string;
  customerEmail?: string;
  bookingDate?: string;
};