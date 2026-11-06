import { fetchSchedules } from "@greline/gtfs";
import type { NetworkId, TransitSchedule } from "@greline/types";
import { cacheLife } from "next/cache";

const HOUR_S = 3600;

/**
 * Schedules of every network for a service day, cached per date: the ~6.5 MB GTFS archive is
 * downloaded and read at most every 6 hours per server instance, whatever the number of visitors.
 */
export async function getSchedules(serviceDate: string): Promise<Record<NetworkId, TransitSchedule>> {
  "use cache";
  cacheLife({ revalidate: 6 * HOUR_S, expire: 48 * HOUR_S });
  return fetchSchedules(serviceDate);
}
