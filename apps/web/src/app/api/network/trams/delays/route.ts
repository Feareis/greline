import { connection } from "next/server";
import { getTripDelays } from "@/lib/trip-delays";

export async function GET(): Promise<Response> {
  await connection();
  try {
    const { delays } = await getTripDelays();
    return Response.json({ delays });
  } catch (error) {
    console.error("GET /api/network/trams/delays: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
