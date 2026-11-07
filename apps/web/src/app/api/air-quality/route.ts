import { connection } from "next/server";
import { AIR_QUALITY_REFRESH_S, getAirQuality } from "@/lib/air-quality";
import { cachedJson } from "@/lib/cached-json";

/** `GET /api/air-quality`: current European air quality index in Grenoble. */
export async function GET(): Promise<Response> {
  await connection();
  try {
    return cachedJson(await getAirQuality(), AIR_QUALITY_REFRESH_S);
  } catch (error) {
    console.error("GET /api/air-quality: Open-Meteo unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
