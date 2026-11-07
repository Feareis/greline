import { distanceMeters } from "@greline/services";
import { mEventSchema, mLineShapesSchema, mRoutesSchema, mTimesheetSchema } from "@greline/validation";
import { describe, expect, it, vi } from "vitest";
import events from "./__fixtures__/m-events-sample.json";
import sample from "./__fixtures__/m-tram-sample.json";
import { cleanDescription, fetchDisruptions, lineIdOfEventCode, parseEventDate, toDisruptions } from "./disruptions";
import { toTransitNetwork } from "./to-network";

// Trams A, C and E, and real events of 2026-11-06/07 (a demonstration cuts most tram lines).
const network = toTransitNetwork({
  routes: mRoutesSchema.parse(sample.routes),
  shapes: mLineShapesSchema.parse(sample.shapes),
  timesheets: new Map(Object.entries(sample.timesheets).map(([id, t]) => [id, mTimesheetSchema.parse(t)])),
});
const parsedEvents = Object.values(events).map((event) => mEventSchema.parse(event));
const night = new Date("2026-11-07T00:30:00+01:00");

describe("event fields", () => {
  it("maps line codes to our line ids", () => {
    expect(lineIdOfEventCode("SEM_C1")).toBe("SEM:C1");
  });

  it("reads dates as Grenoble time", () => {
    expect(parseEventDate("07/11/2026 12:00").toISOString()).toBe("2026-11-07T11:00:00.000Z");
  });

  it("drops the validity period the texts start with", () => {
    expect(cleanDescription("\u00e0 partir du 07/11/2026 12:00|jusqu'au 07/11/2026 19:00\r\nLa ligne A ne circule pas.")).toBe(
      "La ligne A ne circule pas.",
    );
    expect(cleanDescription("Travaux rue Diderot.")).toBe("Travaux rue Diderot.");
  });
});

describe("toDisruptions", () => {
  const disruptions = toDisruptions(parsedEvents, network, night);
  const ofLine = (lineId: string) => disruptions.filter((d) => d.lineId === lineId);

  it("keeps the events of our lines that are not over yet, most severe first", () => {
    expect(new Set(disruptions.map((d) => d.lineId))).toEqual(new Set(["SEM:A", "SEM:C", "SEM:E"]));
    const ranks = disruptions.map((d) => ["interrupted", "disrupted", "info"].indexOf(d.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("drops events already over", () => {
    expect(toDisruptions(parsedEvents, network, new Date("2027-12-01T00:00:00Z"))).toEqual([]);
  });

  it("reads severity, dates and text of an interruption", () => {
    const [cut] = ofLine("SEM:A");
    expect(cut).toMatchObject({
      severity: "interrupted",
      title: "manifestation Grenoble",
      start: "2026-11-07T11:00:00.000Z",
      end: "2026-11-07T18:00:00.000Z",
    });
    expect(cut!.description).toMatch(/^La ligne A ne circule pas entre les stations Malherbe et La Poya/);
  });

  it("finds the stretch between the two named stations, from one station to the other", () => {
    const stretch = ofLine("SEM:A")[0]!.stretch!;
    const station = (name: string) => network.stops.find((s) => s.name === name)!;
    const near = (point: [number, number], name: string) =>
      distanceMeters({ lon: point[0], lat: point[1] }, station(name)) < 40;
    const ends = [stretch[0]!, stretch.at(-1)!];
    expect(ends.some((end) => near(end, "Malherbe"))).toBe(true);
    expect(ends.some((end) => near(end, "La Poya"))).toBe(true);
  });

  it("matches station names despite dashes, accents and spacing", () => {
    // "Annie Fratellini-Esplanade" in the text, "Annie Fratellini - Esplanade" with an en dash in our network.
    expect(ofLine("SEM:E").find((d) => d.severity === "interrupted")?.stretch).not.toBeNull();
  });

  it("falls back to the whole line when the text names no stretch", () => {
    const wholeLine = ofLine("SEM:C").find((d) => d.severity === "disrupted");
    expect(wholeLine?.stretch).toBeNull();
  });
});

describe("fetchDisruptions", () => {
  it("skips malformed events instead of failing the whole feed", async () => {
    const feed = { ...events, broken: { code: "X", titre: "no dates" } };
    const fetchFn = vi.fn(async (_url: string) => Response.json(feed));
    const { disruptions, invalidEvents } = await fetchDisruptions(network, fetchFn, night);
    expect(invalidEvents).toBe(1);
    expect(disruptions.length).toBeGreaterThan(0);
    expect(String(fetchFn.mock.calls[0]![0])).toBe("https://data.mobilites-m.fr/api/dyn/evtTC/json");
  });
});
