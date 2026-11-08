import { connection } from "next/server";
import { cachedJson } from "@/lib/cached-json";
import { getWeather, WEATHER_REFRESH_S } from "@/lib/weather";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return cachedJson(await getWeather(), WEATHER_REFRESH_S);
  } catch (error) {
    console.error("GET /api/weather: Open-Meteo unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
