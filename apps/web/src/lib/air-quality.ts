import { toAirQuality } from "@greline/services";
import type { AirQuality } from "@greline/types";
import { openMeteoAirQualitySchema } from "@greline/validation";
import { cacheLife } from "next/cache";

/** Grenoble city centre (Victor Hugo square), as for the weather. */
const GRENOBLE = { latitude: 45.1885, longitude: 5.7245 };
export const AIR_QUALITY_REFRESH_S = 30 * 60;
const TIMEOUT_MS = 10_000;

const AIR_QUALITY_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality" +
  `?latitude=${GRENOBLE.latitude}&longitude=${GRENOBLE.longitude}` +
  "&current=european_aqi&timezone=Europe%2FParis";

/**
 * Current European air quality index in Grenoble from Open-Meteo (free, no key, CAMS data),
 * cached 30 min: the index itself only changes every hour.
 */
export async function getAirQuality(): Promise<AirQuality> {
  "use cache";
  cacheLife({ stale: AIR_QUALITY_REFRESH_S, revalidate: AIR_QUALITY_REFRESH_S, expire: 4 * AIR_QUALITY_REFRESH_S });
  const response = await fetch(AIR_QUALITY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Open-Meteo air quality answered ${response.status}`);
  return toAirQuality(openMeteoAirQualitySchema.parse(await response.json()));
}
