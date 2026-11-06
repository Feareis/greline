import { stopIdSchema } from "@greline/validation";
import { connection } from "next/server";
import { getStopDepartures } from "@/lib/stop-departures";
import { getTransitNetwork } from "@/lib/transit-network";

const errorResponse = (status: number, error: string): Response => Response.json({ error }, { status });

export async function GET(_request: Request, context: RouteContext<"/api/stops/[id]/departures">): Promise<Response> {
  await connection();
  const { id } = await context.params;
  if (!stopIdSchema.safeParse(id).success) return errorResponse(400, "invalid_stop_id");

  try {
    // The M API answers an unknown station with an empty 204, exactly like a station without
    // departures: our own network is the only way to tell the two apart.
    const network = await getTransitNetwork();
    if (!network.stops.some((stop) => stop.id === id)) return errorResponse(404, "unknown_stop");
    const departures = await getStopDepartures(id, network.lines.map((line) => line.id));
    return Response.json({ departures });
  } catch (error) {
    console.error(`GET /api/stops/${id}/departures: M API unavailable`, error);
    return errorResponse(502, "upstream_unavailable");
  }
}
