import { describe, expect, it } from "vitest";
import { toWeather, weatherCondition } from "./weather";

describe("weatherCondition", () => {
  it("groups WMO codes", () => {
    expect(weatherCondition(0)).toBe("clear");
    expect(weatherCondition(3)).toBe("overcast");
    expect(weatherCondition(48)).toBe("fog");
    expect(weatherCondition(63)).toBe("rain");
    expect(weatherCondition(86)).toBe("snowShowers");
    expect(weatherCondition(99)).toBe("thunderstorm");
  });

  it("names unexpected codes unknown", () => {
    expect(weatherCondition(42)).toBe("unknown");
  });
});

describe("toWeather", () => {
  it("keeps the current conditions and today's sun times as HH:MM", () => {
    expect(
      toWeather({
        current: { temperature_2m: 9.6, apparent_temperature: 8.9, weather_code: 3, is_day: 0, wind_speed_10m: 1.1 },
        daily: { sunrise: ["2026-11-06T07:22"], sunset: ["2026-11-06T17:18"] },
      }),
    ).toEqual({ temperature: 9.6, apparentTemperature: 8.9, weatherCode: 3, isDay: false, windSpeed: 1.1, sunrise: "07:22", sunset: "17:18" });
  });
});
