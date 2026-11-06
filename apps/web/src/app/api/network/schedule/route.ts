import { parisDate } from "@greline/services";
import { networkIdSchema } from "@greline/validation";
import { connection } from "next/server";
import { getSchedules } from "@/lib/schedule";

/** `GET /api/network/schedule?network=chrono`: today's schedule of one network. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const network = networkIdSchema.safeParse(new URL(request.url).searchParams.get("network"));
  if (!network.success) return Response.json({ error: "invalid_network" }, { status: 400 });
  // Today's service day in Grenoble; it also carries yesterday's trips running past midnight.
  const serviceDate = parisDate(new Date());
  try {
    return Response.json((await getSchedules(serviceDate))[network.data]);
  } catch (error) {
    console.error(`GET /api/network/schedule (${serviceDate}): M API unavailable`, error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
