import { stopIdSchema } from "@greline/validation";
import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getItineraries, ITINERARIES_REFRESH_S } from "@/lib/itineraries";
import { getTransitNetwork } from "@/lib/transit-network";

const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

/** `GET /api/itineraries?from=SEM:GENGAR&to=SEM:GENCHAVANT`: best ways between two stops, leaving now. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const params = new URL(request.url).searchParams;
  const from = stopIdSchema.safeParse(params.get("from"));
  const to = stopIdSchema.safeParse(params.get("to"));
  if (!from.success || !to.success) return errorResponse(400, "invalid_stop_id");

  try {
    // The planner takes places, not stop ids: our network gives each stop its position.
    const { stops } = await getTransitNetwork();
    const start = stops.find((stop) => stop.id === from.data);
    const end = stops.find((stop) => stop.id === to.data);
    if (!start || !end) return errorResponse(404, "unknown_stop");
    const itineraries = await getItineraries({ lat: start.lat, lon: start.lon }, { lat: end.lat, lon: end.lon });
    return cachedJson({ itineraries }, ITINERARIES_REFRESH_S);
  } catch (error) {
    console.error(`GET /api/itineraries (${from.data} -> ${to.data}): M API unavailable`, error);
    return errorResponse(502, "upstream_unavailable");
  }
}
