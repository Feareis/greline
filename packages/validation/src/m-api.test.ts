import { describe, expect, it } from "vitest";
import { mLineShapesSchema, mRoutesSchema, mStopTimesSchema, mTimesheetSchema } from "./m-api";

const route = {
  id: "SEM:A",
  gtfsId: "SEM:91",
  shortName: "A",
  longName: "Le Pont-de-Claix / Fontaine La Poya",
  color: "3376B8",
  textColor: "FFFFFF",
  mode: "TRAM",
  type: "TRAM",
};

const timesheetStop = {
  stopId: "SEM:3059",
  trips: [32520],
  name: "Plaine des Sports",
  lat: 45.18762,
  lon: 5.78458,
  parentStation: { id: "SEM:JPS", code: "SEM:GENJPS", name: "Plaine des Sports", city: "Gieres", lat: 45.18769, lon: 5.78456 },
};

describe("mRoutesSchema", () => {
  it("keeps used fields and strips the others", () => {
    const [parsed] = mRoutesSchema.parse([route]);
    expect(parsed).toEqual({
      id: "SEM:A",
      shortName: "A",
      longName: "Le Pont-de-Claix / Fontaine La Poya",
      color: "3376B8",
      textColor: "FFFFFF",
      type: "TRAM",
    });
  });

  it("rejects a color that is not 6-digit hex", () => {
    expect(mRoutesSchema.safeParse([{ ...route, color: "#3376B8" }]).success).toBe(false);
  });
});

describe("mLineShapesSchema", () => {
  const shapes = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { CODE: "SEM_D", type: "ligne", id: "SEM_D" },
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[5.75728, 45.19258], [5.71542, 45.19084]],
            [[5.75728, 45.19258], [5.75772, 45.17211]],
          ],
        },
      },
    ],
  };

  it("accepts a multi-part shape", () => {
    expect(mLineShapesSchema.parse(shapes).features[0]?.geometry.coordinates).toHaveLength(2);
  });

  it("rejects swapped coordinates (latitude out of range)", () => {
    const swapped = structuredClone(shapes);
    swapped.features[0]!.geometry.coordinates[0]![0] = [45.19258, 95.75728];
    expect(mLineShapesSchema.safeParse(swapped).success).toBe(false);
  });
});

describe("mTimesheetSchema", () => {
  it("accepts directions keyed by number strings", () => {
    const parsed = mTimesheetSchema.parse({ "0": { arrets: [timesheetStop], trips: [], prevTime: 1, nextTime: 2 } });
    expect(parsed["0"]?.arrets[0]?.parentStation.code).toBe("SEM:GENJPS");
  });

  it("rejects a stop without parent station code", () => {
    const { code: _code, ...parentWithoutCode } = timesheetStop.parentStation;
    const stop = { ...timesheetStop, parentStation: parentWithoutCode };
    expect(mTimesheetSchema.safeParse({ "0": { arrets: [stop] } }).success).toBe(false);
  });
});

describe("mStopTimesSchema", () => {
  const group = {
    pattern: { id: "SEM:B:1:234041489", desc: "Plaine des Sports", dir: 2, shortDesc: "GIERES PL. DES " },
    times: [
      {
        stopId: "SEM:2216",
        scheduledDeparture: 36360,
        realtimeDeparture: 36408,
        departureDelay: 48,
        realtime: true,
        realtimeState: "UPDATED",
        serviceDay: 1793919600,
        tripId: "SEM:32165104",
      },
    ],
  };

  it("accepts a pattern group with its times", () => {
    const [parsed] = mStopTimesSchema.parse([group]);
    expect(parsed?.times[0]).toEqual({ tripId: "SEM:32165104", scheduledDeparture: 36360, realtimeDeparture: 36408, realtime: true, serviceDay: 1793919600 });
  });

  it("rejects a time without service day", () => {
    const { serviceDay: _serviceDay, ...time } = group.times[0]!;
    expect(mStopTimesSchema.safeParse([{ ...group, times: [time] }]).success).toBe(false);
  });
});
