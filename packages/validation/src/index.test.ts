import { describe, expect, it } from "vitest";
import { departuresResponseSchema, itineraryEndParamSchema, stopIdSchema, transitScheduleSchema, tripDelaysResponseSchema } from "./index";

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

describe("itineraryEndParamSchema", () => {
  it("reads a stop id", () => {
    expect(itineraryEndParamSchema.parse("SEM:GENGAR")).toEqual({ kind: "stop", stopId: "SEM:GENGAR" });
  });

  it("reads a position, rounded to about 100 m", () => {
    expect(itineraryEndParamSchema.parse("45.18849,5.72451")).toEqual({ kind: "position", lat: 45.188, lon: 5.725 });
    expect(itineraryEndParamSchema.parse("-33.9,-70.1")).toEqual({ kind: "position", lat: -33.9, lon: -70.1 });
  });

  it("rejects anything else", () => {
    for (const bad of ["", "45.1", "45.1,abc", "1e5,2", "91,5", "45,181", "45.1,5.7,3", " 45.1,5.7", "SEM:GEN GAR"]) {
      expect(itineraryEndParamSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("departuresResponseSchema", () => {
  it("accepts our API departures payload", () => {
    const payload = {
      departures: [
        { lineId: "SEM:A", stopId: "SEM:GENGAR", direction: "1", headsign: "La Poya", departureTime: "2026-11-06T09:06:48.000Z", realtime: true },
      ],
    };
    expect(departuresResponseSchema.parse(payload).departures).toHaveLength(1);
  });
});

describe("transitScheduleSchema", () => {
  const schedule = {
    serviceDate: "2026-11-06",
    shapes: [
      [
        [5.67, 45.19],
        [5.71, 45.19],
      ],
    ],
    patterns: [{ lineId: "SEM:A", headsign: "Gares", stopIds: ["SEM:GENLP", "SEM:GENGAR"], shape: 0, stopDistances: [0, 3150] }],
    trips: [{ id: "SEM:1", pattern: 0, start: 1793956000, offsets: [0, 600] }],
  };

  it("accepts our API schedule payload", () => {
    expect(transitScheduleSchema.parse(schedule).trips).toHaveLength(1);
  });

  it("rejects a trip pointing to a missing pattern", () => {
    expect(transitScheduleSchema.safeParse({ ...schedule, trips: [{ ...schedule.trips[0], pattern: 3 }] }).success).toBe(false);
  });

  it("rejects a pattern pointing to a missing shape or without one distance per stop", () => {
    const pattern = schedule.patterns[0]!;
    expect(transitScheduleSchema.safeParse({ ...schedule, patterns: [{ ...pattern, shape: 1 }] }).success).toBe(false);
    expect(transitScheduleSchema.safeParse({ ...schedule, patterns: [{ ...pattern, stopDistances: [0, 10, 20] }] }).success).toBe(false);
  });
});

describe("tripDelaysResponseSchema", () => {
  it("accepts delays in seconds keyed by trip id", () => {
    expect(tripDelaysResponseSchema.parse({ delays: { "SEM:1": 90, "SEM:2": -20 } }).delays["SEM:2"]).toBe(-20);
  });

  it("rejects non-numeric delays", () => {
    expect(tripDelaysResponseSchema.safeParse({ delays: { "SEM:1": "late" } }).success).toBe(false);
  });
});
