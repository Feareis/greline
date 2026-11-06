import { minutesUntil } from "@greline/services";
import { useNow } from "./use-now";

/** Live countdown (in minutes) to a departure time. */
export function useMinutesUntil(departureTime: string): number {
  const now = useNow();
  return minutesUntil(departureTime, now);
}
