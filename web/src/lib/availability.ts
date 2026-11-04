import { getAvailability } from './api';
import type { AvailabilityDay } from '../types/booking';

// The calendar and slot picker consume the same daily endpoint. Share pending
// requests and briefly reuse results while navigating, without a session-long cache.
export function createAvailabilityLoader() {
  const requests = new Map<string, { promise: Promise<AvailabilityDay>; expiresAt: number }>();

  return {
    get(serviceId: number, date: string): Promise<AvailabilityDay> {
      const now = Date.now();
      for (const [key, entry] of requests) {
        if (entry.expiresAt <= now) requests.delete(key);
      }

      const key = `${serviceId}:${date}`;
      const cached = requests.get(key);
      if (cached) return cached.promise;

      const entry = { promise: getAvailability(serviceId, date), expiresAt: Infinity };
      entry.promise = entry.promise.then(
        (result) => {
          entry.expiresAt = Date.now() + 30_000;
          return result;
        },
        (error: unknown) => {
          if (requests.get(key) === entry) requests.delete(key);
          throw error;
        },
      );
      requests.set(key, entry);
      return entry.promise;
    },
    invalidate(serviceId?: number, date?: string) {
      // Old promises may still settle, but must not be reused after a mutation.
      for (const key of requests.keys()) {
        if (serviceId === undefined || (key.startsWith(`${serviceId}:`)
          && (date === undefined || key === `${serviceId}:${date}`))) {
          requests.delete(key);
        }
      }
    },
  };
}
