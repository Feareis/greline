import { describe, expect, it } from "vitest";
import { weatherCondition } from "./weather";

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
