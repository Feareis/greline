import { describe, expect, it } from "vitest";
import { departureCountdown, departureSeconds, groupDepartures } from "./departures";

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

describe("groupDepartures", () => {
  const line = (id: string, shortName: string) => ({
    id,
    shortName,
    longName: shortName,
    mode: "tram" as const,
    network: "tram" as const,
    color: "3376B8",
    textColor: "FFFFFF",
  });
  const lines = [line("SEM:A", "A"), line("SEM:B", "B"), line("SEM:C", "C")];
  const departure = (lineId: string, headsign: string, time: string) => ({
    lineId,
    stopId: "SEM:GENGAR",
    headsign,
    departureTime: `2026-11-06T${time}:00Z`,
    realtime: true,
  });

  const grouped = groupDepartures(
    [
      departure("SEM:B", "Oxford", "09:07"),
      departure("SEM:A", "La Poya", "09:12"),
      departure("SEM:A", "L'Etoile", "09:05"),
      departure("SEM:A", "La Poya", "09:03"),
      departure("SEM:X", "Nowhere", "09:01"),
    ],
    lines,
  );

  it("orders lines like the network and skips lines without departures", () => {
    expect(grouped.map((g) => g.line.id)).toEqual(["SEM:A", "SEM:B"]);
  });

  it("orders directions by their next departure", () => {
    expect(grouped[0]!.directions.map((d) => d.headsign)).toEqual(["La Poya", "L'Etoile"]);
  });

  it("sorts departures chronologically within a direction", () => {
    const laPoya = grouped[0]!.directions[0]!.departures.map((d) => d.departureTime);
    expect(laPoya).toEqual(["2026-11-06T09:03:00Z", "2026-11-06T09:12:00Z"]);
  });

  it("drops departures of lines that are not on the map", () => {
    expect(grouped.flatMap((g) => g.directions).some((d) => d.headsign === "Nowhere")).toBe(false);
  });
});
