import { z } from "zod";

// Schema of the Open-Meteo forecast API (api.open-meteo.com/v1/forecast), restricted to the
// fields we request. Times are local to the requested time zone, without offset.

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "expected YYYY-MM-DDTHH:MM");

export const openMeteoForecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    weather_code: z.number().int(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    wind_speed_10m: z.number().nonnegative(),
  }),
  daily: z.object({
    sunrise: z.array(localDateTime).min(1),
    sunset: z.array(localDateTime).min(1),
  }),
});
export type OpenMeteoForecast = z.infer<typeof openMeteoForecastSchema>;

/** Schema of the Open-Meteo air quality API (air-quality-api.open-meteo.com/v1/air-quality), current European index only. */
export const openMeteoAirQualitySchema = z.object({
  current: z.object({ european_aqi: z.number().nonnegative() }),
});
export type OpenMeteoAirQuality = z.infer<typeof openMeteoAirQualitySchema>;
