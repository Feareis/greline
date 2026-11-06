import { describe, expect, it } from "vitest";
import { fleetSummary } from "./traffic";
import type { VehiclePosition } from "./vehicles";

const tram = (lineId: string, delaySeconds: number): VehiclePosition => ({
  key: `${lineId}${delaySeconds}${Math.random()}`,
  tripId: "SEM:1",
  lineId,
  pattern: 0,
  distance: 0,
  delaySeconds,
});

describe("fleetSummary", () => {
  it("counts running trams per line and the late ones, with their mean delay", () => {
    const summary = fleetSummary([tram("SEM:A", 0), tram("SEM:A", 300), tram("SEM:B", 180), tram("SEM:B", 120)]);
    expect(summary).toMatchObject({ running: 4, byLine: { "SEM:A": 2, "SEM:B": 2 }, late: 2, averageLateSeconds: 240 });
  });

  it("rates the network by the share of late trams", () => {
    const onTime = Array.from({ length: 9 }, () => tram("SEM:A", 30));
    expect(fleetSummary([...onTime, tram("SEM:A", 30)]).level).toBe("smooth");
    expect(fleetSummary([...onTime, tram("SEM:A", 600)]).level).toBe("someDelays");
    expect(fleetSummary([...onTime.slice(0, 2), tram("SEM:A", 600)]).level).toBe("disrupted");
  });

  it("is smooth with no tram running (night)", () => {
    expect(fleetSummary([])).toEqual({ running: 0, byLine: {}, late: 0, averageLateSeconds: 0, level: "smooth" });
  });
});
