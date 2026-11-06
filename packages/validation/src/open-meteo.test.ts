import { describe, expect, it } from "vitest";
import { openMeteoForecastSchema } from "./open-meteo";

// Trimmed real answer for Grenoble (2026-11-06).
const forecast = {
  latitude: 45.181904,
  current: { time: "2026-11-06T18:45", temperature_2m: 9.6, apparent_temperature: 8.9, weather_code: 3, is_day: 0, wind_speed_10m: 1.1 },
  daily: { time: ["2026-11-06"], sunrise: ["2026-11-06T07:22"], sunset: ["2026-11-06T17:18"] },
};

describe("openMeteoForecastSchema", () => {
  it("accepts a real forecast and keeps only the fields we use", () => {
    const parsed = openMeteoForecastSchema.parse(forecast);
    expect(parsed.current.weather_code).toBe(3);
    expect(parsed).not.toHaveProperty("latitude");
  });

  it("rejects a forecast without today's sunrise", () => {
    expect(openMeteoForecastSchema.safeParse({ ...forecast, daily: { sunrise: [], sunset: [] } }).success).toBe(false);
  });
});
