import { describe, expect, it } from "vitest";
import { airQualityLevel, toAirQuality } from "./air-quality";

describe("airQualityLevel", () => {
  it("follows the bands of the European air quality index", () => {
    expect(airQualityLevel(0)).toBe("good");
    expect(airQualityLevel(20)).toBe("good");
    expect(airQualityLevel(20.5)).toBe("fair");
    expect(airQualityLevel(52)).toBe("moderate");
    expect(airQualityLevel(61)).toBe("poor");
    expect(airQualityLevel(99)).toBe("veryPoor");
    expect(airQualityLevel(100)).toBe("veryPoor");
    expect(airQualityLevel(140)).toBe("extremelyPoor");
  });
});

describe("toAirQuality", () => {
  it("keeps the index, rounded", () => {
    expect(toAirQuality({ current: { european_aqi: 51.6 } })).toEqual({ index: 52 });
  });
});
