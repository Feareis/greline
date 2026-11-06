import { toWeather } from "@greline/services";
import type { Weather } from "@greline/types";
import { openMeteoForecastSchema } from "@greline/validation";
import { cacheLife } from "next/cache";

/** Grenoble city centre (Victor Hugo square). */
const GRENOBLE = { latitude: 45.1885, longitude: 5.7245 };
const REFRESH_S = 15 * 60;
const TIMEOUT_MS = 10_000;

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${GRENOBLE.latitude}&longitude=${GRENOBLE.longitude}` +
  "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
  "&daily=sunrise,sunset&timezone=Europe%2FParis&forecast_days=1";

/**
 * Current weather in Grenoble from Open-Meteo (free, no key, CC BY 4.0), cached 15 min: the
 * model itself only updates every 15 min.
 */
export async function getWeather(): Promise<Weather> {
  "use cache";
  cacheLife({ stale: REFRESH_S, revalidate: REFRESH_S, expire: 4 * REFRESH_S });
  const response = await fetch(FORECAST_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
  return toWeather(openMeteoForecastSchema.parse(await response.json()));
}
