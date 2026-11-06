import { connection } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return Response.json(await getWeather());
  } catch (error) {
    console.error("GET /api/weather: Open-Meteo unavailable", error);
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
