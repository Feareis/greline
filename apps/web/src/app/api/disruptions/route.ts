import { connection } from "next/server";
import { getDisruptions } from "@/lib/disruptions";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return Response.json({ disruptions: await getDisruptions() });
  } catch (error) {
    console.error("GET /api/disruptions: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
