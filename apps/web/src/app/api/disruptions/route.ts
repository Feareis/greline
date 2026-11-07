import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { DISRUPTIONS_REFRESH_S, getDisruptions } from "@/lib/disruptions";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return cachedJson({ disruptions: await getDisruptions() }, DISRUPTIONS_REFRESH_S);
  } catch (error) {
    console.error("GET /api/disruptions: M API unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
