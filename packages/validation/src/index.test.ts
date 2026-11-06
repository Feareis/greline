import { describe, expect, it } from "vitest";
import { departuresResponseSchema, stopIdSchema } from "./index";

describe("stopIdSchema", () => {
  it("accepts M API cluster codes", () => {
    expect(stopIdSchema.safeParse("SEM:GENGAR").success).toBe(true);
    expect(stopIdSchema.safeParse("SEM:GENMAY1").success).toBe(true);
  });

  it("rejects anything that could escape the URL path", () => {
    for (const bad of ["", "../../x", "SEM:GEN/GAR", "SEM:GEN GAR", "sem:GENGAR", `SEM:${"A".repeat(129)}`]) {
      expect(stopIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("departuresResponseSchema", () => {
  it("accepts our API departures payload", () => {
    const payload = {
      departures: [
        { lineId: "SEM:A", stopId: "SEM:GENGAR", headsign: "La Poya", departureTime: "2026-11-06T09:06:48.000Z", realtime: true },
      ],
    };
    expect(departuresResponseSchema.parse(payload).departures).toHaveLength(1);
  });
});
