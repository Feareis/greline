import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getTripDelays, TRIP_DELAYS_REFRESH_S } from "@/lib/trip-delays";

export async function GET(): Promise<Response> {
  await connection();
  try {
    const { delays } = await getTripDelays();
    return cachedJson({ delays }, TRIP_DELAYS_REFRESH_S);
  } catch (error) {
    console.error("GET /api/network/delays: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
