import { useEffect, useState } from "react";

/** Current date, refreshed every `intervalMs` milliseconds. */
export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
