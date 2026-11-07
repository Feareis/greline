import type { Disruption } from "@greline/types";
import { describe, expect, it } from "vitest";
import { disruptionPeriod, isOngoing, startsLaterToday } from "./disruptions";

const disruption = (start: string, end: string): Disruption => ({
  id: "SMA_1",
  lineId: "SEM:A",
  severity: "interrupted",
  title: "manifestation Grenoble",
  description: "",
  start,
  end,
  stretch: null,
});

// A demonstration on Saturday 2026-11-07 from 12:00 to 19:00 (Grenoble time, UTC+1).
const demonstration = disruption("2026-11-07T11:00:00.000Z", "2026-11-07T18:00:00.000Z");
const at = (time: string) => new Date(`2026-11-07T${time}:00+01:00`);

describe("isOngoing and startsLaterToday", () => {
  it("tells ongoing, upcoming today and finished disruptions apart", () => {
    expect([isOngoing(demonstration, at("09:00")), startsLaterToday(demonstration, at("09:00"))]).toEqual([false, true]);
    expect([isOngoing(demonstration, at("15:00")), startsLaterToday(demonstration, at("15:00"))]).toEqual([true, false]);
    expect([isOngoing(demonstration, at("19:00")), startsLaterToday(demonstration, at("19:00"))]).toEqual([false, false]);
  });

  it("does not count a disruption of another day as later today", () => {
    expect(startsLaterToday(demonstration, new Date("2026-11-06T22:00:00+01:00"))).toBe(false);
  });
});

describe("disruptionPeriod", () => {
  it("words a disruption of today by its hours", () => {
    expect(disruptionPeriod(demonstration, at("09:00"))).toEqual({ kind: "fromTo", start: "12:00", end: "19:00" });
    expect(disruptionPeriod(demonstration, at("15:00"))).toEqual({ kind: "untilTime", end: "19:00" });
  });

  it("words a longer one by its dates", () => {
    const works = disruption("2026-11-04T03:00:00.000Z", "2026-11-21T02:00:00.000Z");
    expect(disruptionPeriod(works, at("15:00"))).toEqual({ kind: "untilDate", end: "21/11" });
    expect(disruptionPeriod(works, new Date("2026-11-01T12:00:00+01:00"))).toEqual({ kind: "fromDate", start: "04/11" });
  });
});
