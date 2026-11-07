import { distanceToPolylineMeters } from "@greline/services";
import { mLineShapesSchema, mRoutesSchema, mTimesheetSchema } from "@greline/validation";
import { describe, expect, it } from "vitest";
import busSample from "./__fixtures__/m-bus-sample.json";
import sample from "./__fixtures__/m-tram-sample.json";
import { networkOfRouteType, toTransitNetwork } from "./to-network";

// Real M API responses (lines A and C), trimmed to the used fields. C's timesheet was fetched
// at night, when one direction runs an occasional extension to Plaine des Sports.
const input = {
  routes: mRoutesSchema.parse(sample.routes),
  shapes: mLineShapesSchema.parse(sample.shapes),
  timesheets: new Map(Object.entries(sample.timesheets).map(([id, t]) => [id, mTimesheetSchema.parse(t)])),
};

describe("toTransitNetwork", () => {
  const network = toTransitNetwork(input);
  const lineC = network.lines.find((l) => l.id === "SEM:C")!;

  it("converts routes to tram lines with their official colors", () => {
    expect(network.lines.map(({ id, shortName, mode, color }) => ({ id, shortName, mode, color }))).toEqual([
      { id: "SEM:A", shortName: "A", mode: "tram", color: "3376B8" },
      { id: "SEM:C", shortName: "C", mode: "tram", color: "C20078" },
      { id: "SEM:E", shortName: "E", mode: "tram", color: "533786" },
    ]);
  });

  it("keeps the stop order of each direction, as numbered by the M API", () => {
    const lineA = network.lines.find((l) => l.id === "SEM:A")!;
    expect(lineA.directions.map((d) => d.id)).toEqual(["0", "1"]);
    const [outbound, inbound] = lineA.directions;
    expect(inbound!.stopIds).toEqual([...outbound!.stopIds].reverse());
  });

  it("orders stops along the line using the longest timesheet direction", () => {
    const lineA = network.lines.find((l) => l.id === "SEM:A")!;
    expect(lineA.stopIds).toHaveLength(31);
    expect(lineC.stopIds.at(-1)).toBe("SEM:GENPRI");
  });

  it("drops occasional variant stops lying far from the official shape", () => {
    expect(lineC.stopIds).not.toContain("SEM:GENJPS");
    expect(lineC.stopIds).not.toContain("SEM:GENGGU");
    expect(lineC.stopIds).not.toContain("SEM:GENMAY1");
    expect(lineC.stopIds[0]).toBe("SEM:GENCO");
    expect(lineC.stopIds).toHaveLength(19);
  });

  it("uses cluster codes as stop ids and lists shared stations once", () => {
    const chavant = network.stops.filter((s) => s.id === "SEM:GENCHV");
    expect(chavant).toHaveLength(1);
    expect(chavant[0]).toMatchObject({ name: "Chavant", city: "Grenoble" });
    // A, C and E share Chavant (A/C), Vallier - Liberation (C/E) and Alsace-Lorraine (A/E).
    expect(network.stops).toHaveLength(31 + 19 + 17 - 3);
  });

  it("keeps the official shape of each line, as [lon, lat] parts", () => {
    const lineA = network.lines.find((l) => l.id === "SEM:A")!;
    expect(lineA.shape).toHaveLength(1);
    expect(lineA.shape[0]!.length).toBeGreaterThan(100);
    const [lon, lat] = lineA.shape[0]![0]!;
    expect(lon).toBeCloseTo(5.67, 1);
    expect(lat).toBeCloseTo(45.2, 1);
  });

  // The M cluster point averages every stop of the name, bus stops included (up to 76 m off the
  // tracks); averaging tram platforms fails where lines cross on different streets (Vallier -
  // Liberation: 32 m). 20 m leaves room for Louise Michel, whose M shape ends 16 m short.
  it("places each station on the tracks of its lines, including where lines cross", () => {
    for (const stop of network.stops) {
      const parts = network.lines.filter((l) => l.stopIds.includes(stop.id)).flatMap((l) => l.shape);
      const meters = Math.round(Math.min(...parts.map((part) => distanceToPolylineMeters([stop.lon, stop.lat], part))));
      expect({ station: stop.name, meters }).toEqual({ station: stop.name, meters: expect.toSatisfy((m: number) => m <= 20) });
    }
  });

  it("fails loudly when a line has no shape", () => {
    const withoutShapes = { ...input, shapes: { ...input.shapes, features: [] } };
    expect(() => toTransitNetwork(withoutShapes)).toThrow(/SEM:A/);
  });
});

describe("toTransitNetwork with buses", () => {
  // Real M API responses for Chrono C1, plus a periurban Chrono run by another operator (GSV).
  const withBuses = toTransitNetwork({
    routes: [...input.routes, ...mRoutesSchema.parse(busSample.routes)],
    shapes: { ...input.shapes, features: [...input.shapes.features, ...mLineShapesSchema.parse(busSample.shapes).features] },
    timesheets: new Map([...input.timesheets, ["SEM:C1", mTimesheetSchema.parse(busSample.timesheets["SEM:C1"])]]),
  });
  const c1 = withBuses.lines.find((l) => l.id === "SEM:C1")!;

  it("lists trams first, then buses, and only SEM lines (our GTFS feed is SEM's)", () => {
    expect(withBuses.lines.map((l) => `${l.id}/${l.network}/${l.mode}`)).toEqual([
      "SEM:A/tram/tram",
      "SEM:C/tram/tram",
      "SEM:E/tram/tram",
      "SEM:C1/chrono/bus",
    ]);
  });

  it("orders bus stops along the line and places them on a platform", () => {
    // The first stop of the timesheet's longest direction (Montbonnot, Pre de l'Eau).
    expect(c1.stopIds[0]).toBe(busSample.timesheets["SEM:C1"]["0"].arrets[0]!.parentStation.code);
    expect(c1.stopIds.length).toBeGreaterThan(20);
    const firstStop = withBuses.stops.find((s) => s.id === c1.stopIds[0])!;
    expect(distanceToPolylineMeters([firstStop.lon, firstStop.lat], c1.shape[0]!)).toBeLessThan(30);
  });

  it("simplifies shapes without moving them", () => {
    expect(c1.shape[0]!.length).toBeLessThan(busSample.shapes.features[0]!.geometry.coordinates[0]!.length);
  });
});

describe("networkOfRouteType", () => {
  it("groups the M networks we show and ignores the others", () => {
    expect(networkOfRouteType("TRAM")).toBe("tram");
    expect(networkOfRouteType("CHRONO_PERI")).toBe("chrono");
    expect(networkOfRouteType("PROXIMO")).toBe("proximo");
    expect(networkOfRouteType("FLEXO")).toBeUndefined();
  });
});
