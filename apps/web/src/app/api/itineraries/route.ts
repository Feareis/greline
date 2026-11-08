import { resolveItineraryEnd } from "@greline/services";
import { itineraryEndParamSchema } from "@greline/validation";
import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getItineraries, ITINERARIES_REFRESH_S } from "@/lib/itineraries";
import { getTransitNetwork } from "@/lib/transit-network";

const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

/**
 * `GET /api/itineraries?from=SEM:GENGAR&to=SEM:GENCHAVANT`: best ways between two places,
 * leaving now. Each end is a stop id or "lat,lon" (rounded to ~100 m, near the network only).
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const params = new URL(request.url).searchParams;
  const from = itineraryEndParamSchema.safeParse(params.get("from"));
  const to = itineraryEndParamSchema.safeParse(params.get("to"));
  if (!from.success || !to.success) return errorResponse(400, "invalid_place");

  try {
    // The planner takes places, not stop ids: our network gives each stop its position.
    const { stops } = await getTransitNetwork();
    const start = resolveItineraryEnd(from.data, stops);
    const end = resolveItineraryEnd(to.data, stops);
    if (start === "unknown_stop" || end === "unknown_stop") return errorResponse(404, "unknown_stop");
    if (start === "outside_service_area" || end === "outside_service_area") return errorResponse(400, "outside_service_area");
    const itineraries = await getItineraries(start, end);
    return cachedJson({ itineraries }, ITINERARIES_REFRESH_S);
  } catch (error) {
    console.error(`GET /api/itineraries (${params.get("from")} -> ${params.get("to")}): M API unavailable`, error);
    return errorResponse(502, "upstream_unavailable");
  }
}
