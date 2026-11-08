import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getParkAndRides, PARK_AND_RIDES_REFRESH_S } from "@/lib/park-and-rides";

/** `GET /api/park-and-rides`: P+R car parks, with their free spaces when they are counted. */
export async function GET(): Promise<Response> {
  await connection();
  try {
    return cachedJson({ parkAndRides: await getParkAndRides() }, PARK_AND_RIDES_REFRESH_S);
  } catch (error) {
    console.error("GET /api/park-and-rides: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
