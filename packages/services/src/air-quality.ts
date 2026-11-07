import type { AirQuality } from "@greline/types";
import type { OpenMeteoAirQuality } from "@greline/validation";

/** The six bands of the European air quality index, also used by the French ATMO scale. */
export type AirQualityLevel = "good" | "fair" | "moderate" | "poor" | "veryPoor" | "extremelyPoor";

/** Upper bound of each band, in index points (European Environment Agency). */
const BANDS: ReadonlyArray<readonly [number, AirQualityLevel]> = [
  [20, "good"],
  [40, "fair"],
  [60, "moderate"],
  [80, "poor"],
  [100, "veryPoor"],
];

export function airQualityLevel(index: number): AirQualityLevel {
  return BANDS.find(([upper]) => index <= upper)?.[1] ?? "extremelyPoor";
}

/** Our air quality payload from an Open-Meteo answer. */
export function toAirQuality(answer: OpenMeteoAirQuality): AirQuality {
  return { index: Math.round(answer.current.european_aqi) };
}
