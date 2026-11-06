import { fetchTramSchedule } from "@greline/gtfs";
import type { TramSchedule } from "@greline/types";
import { cacheLife } from "next/cache";

const HOUR_S = 3600;

/**
 * Tram schedule of a service day, cached per date: the ~6.5 MB GTFS archive is downloaded at
 * most every 6 hours per server instance, whatever the number of visitors.
 */
export async function getTramSchedule(serviceDate: string): Promise<TramSchedule> {
  "use cache";
  cacheLife({ revalidate: 6 * HOUR_S, expire: 48 * HOUR_S });
  return fetchTramSchedule(serviceDate);
}
