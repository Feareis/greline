import { describe, expect, it } from "vitest";
import { departureCountdown, departureSeconds } from "./departures";

describe("departureSeconds", () => {
  it("uses the realtime estimate when the vehicle reports one", () => {
    expect(departureSeconds({ realtime: true, scheduledDeparture: 36_360, realtimeDeparture: 36_408 })).toBe(36_408);
  });

  it("falls back to the schedule when there is no realtime data", () => {
    expect(departureSeconds({ realtime: false, scheduledDeparture: 36_360, realtimeDeparture: 99_999 })).toBe(36_360);
  });
});

describe("departureCountdown", () => {
  const now = new Date("2026-11-06T09:00:00Z");

  it("announces a departure in less than a minute as approaching", () => {
    expect(departureCountdown("2026-11-06T09:00:50Z", now)).toEqual({ kind: "approaching" });
  });

  it("treats an already passed departure as approaching (data lags behind the vehicle)", () => {
    expect(departureCountdown("2026-11-06T08:59:30Z", now)).toEqual({ kind: "approaching" });
  });

  it("counts whole minutes below one hour", () => {
    expect(departureCountdown("2026-11-06T09:02:10Z", now)).toEqual({ kind: "minutes", minutes: 2 });
    expect(departureCountdown("2026-11-06T09:59:59Z", now)).toEqual({ kind: "minutes", minutes: 59 });
  });

  it("switches to the Paris clock time from 60 minutes on", () => {
    expect(departureCountdown("2026-11-06T10:00:00Z", now)).toEqual({ kind: "clock", time: "11:00" });
  });
});
