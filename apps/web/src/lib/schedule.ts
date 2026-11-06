import { fetchSchedule } from "@greline/gtfs";
import type { TransitSchedule } from "@greline/types";
import { cacheLife } from "next/cache";

const HOUR_S = 3600;

/**
 * Tram schedule of a service day, cached per date: the ~6.5 MB GTFS archive is downloaded at
 * most every 6 hours per server instance, whatever the number of visitors.
 */
export async function getSchedule(serviceDate: string): Promise<TransitSchedule> {
  "use cache";
  cacheLife({ revalidate: 6 * HOUR_S, expire: 48 * HOUR_S });
  return fetchSchedule(serviceDate);
}
