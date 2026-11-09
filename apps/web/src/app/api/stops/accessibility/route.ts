import { parisDate } from "@greline/services";
import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getGtfsDay } from "@/lib/schedule";

/** Accessibility only changes with a new GTFS feed, a few times a year. */
const ACCESSIBILITY_CDN_MAX_AGE_S = 6 * 3600;

/** `GET /api/stops/accessibility`: wheelchair access per stop id, read from the same GTFS feed as the schedules. */
export async function GET(): Promise<Response> {
  await connection();
  const serviceDate = parisDate(new Date());
  try {
    return cachedJson({ accessibility: (await getGtfsDay(serviceDate)).stopAccess }, ACCESSIBILITY_CDN_MAX_AGE_S);
  } catch (error) {
    console.error(`GET /api/stops/accessibility (${serviceDate}): M API unavailable`, error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
