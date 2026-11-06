import { distanceToPolylineMeters } from "@greline/services";
import { mLineShapesSchema, mRoutesSchema, mTimesheetSchema } from "@greline/validation";
import { describe, expect, it } from "vitest";
import sample from "./__fixtures__/m-tram-sample.json";
import { toTramNetwork } from "./to-network";

// Real M API responses (lines A and C), trimmed to the used fields. C's timesheet was fetched
// at night, when one direction runs an occasional extension to Plaine des Sports.
const input = {
  routes: mRoutesSchema.parse(sample.routes),
  shapes: mLineShapesSchema.parse(sample.shapes),
  timesheets: new Map(Object.entries(sample.timesheets).map(([id, t]) => [id, mTimesheetSchema.parse(t)])),
};

describe("toTramNetwork", () => {
  const network = toTramNetwork(input);
  const lineC = network.lines.find((l) => l.id === "SEM:C")!;

  it("converts routes to tram lines with their official colors", () => {
    expect(network.lines.map(({ id, shortName, mode, color }) => ({ id, shortName, mode, color }))).toEqual([
      { id: "SEM:A", shortName: "A", mode: "tram", color: "3376B8" },
      { id: "SEM:C", shortName: "C", mode: "tram", color: "C20078" },
      { id: "SEM:E", shortName: "E", mode: "tram", color: "533786" },
    ]);
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
    expect(() => toTramNetwork(withoutShapes)).toThrow(/SEM:A/);
  });
});
