import { connection } from "next/server";
import { getTransitNetwork } from "@/lib/transit-network";

export async function GET(): Promise<Response> {
  // Always answer at request time: prerendering at build time would freeze a 502 into the
  // build whenever the M API happens to be down. The data itself stays cached for a day.
  await connection();
  try {
    return Response.json(await getTransitNetwork());
  } catch (error) {
    console.error("GET /api/network/trams: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
