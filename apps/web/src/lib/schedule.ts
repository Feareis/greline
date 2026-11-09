import { fetchGtfsDay, type GtfsDay } from "@greline/gtfs";
import { cacheLife } from "next/cache";

const HOUR_S = 3600;

/**
 * Schedules of every network and stop accessibility for a service day, cached per date: the
 * ~6.5 MB GTFS archive is downloaded and read at most every 6 hours per server instance, whatever
 * the number of visitors.
 */
export async function getGtfsDay(serviceDate: string): Promise<GtfsDay> {
  "use cache";
  cacheLife({ revalidate: 6 * HOUR_S, expire: 48 * HOUR_S });
  return fetchGtfsDay(serviceDate);
}
