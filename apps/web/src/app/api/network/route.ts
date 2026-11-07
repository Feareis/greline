import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getTransitNetwork } from "@/lib/transit-network";

/** Stops and lines change a few times a year: an hour on the CDN is plenty fresh. */
const NETWORK_CDN_MAX_AGE_S = 3600;

export async function GET(): Promise<Response> {
  // Always answer at request time: prerendering at build time would freeze a 502 into the
  // build whenever the M API happens to be down. The data itself stays cached for a day.
  await connection();
  try {
    return cachedJson(await getTransitNetwork(), NETWORK_CDN_MAX_AGE_S);
  } catch (error) {
    console.error("GET /api/network: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
