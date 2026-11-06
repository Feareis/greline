import { parisDate } from "@greline/services";
import { connection } from "next/server";
import { getSchedule } from "@/lib/schedule";

export async function GET(): Promise<Response> {
  await connection();
  // Today's service day in Grenoble; it also carries yesterday's trips running past midnight.
  const serviceDate = parisDate(new Date());
  try {
    return Response.json(await getSchedule(serviceDate));
  } catch (error) {
    console.error(`GET /api/network/trams/schedule (${serviceDate}): M API unavailable`, error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
