import { describe, expect, it } from "vitest";
import { formatClockTime, minutesUntil, parisDate, parisDateTime, serviceDayOrigin, serviceTimeToDate } from "./time";

const unixSeconds = (iso: string): number => Date.parse(iso) / 1000;

describe("serviceTimeToDate", () => {
  // Observed in the M API on 2026-11-06: serviceDay = midnight in Paris (UTC+1).
  const regularDay = 1793919600;

  it("adds GTFS seconds to the service day", () => {
    expect(serviceTimeToDate(regularDay, 36_408).toISOString()).toBe("2026-11-06T09:06:48.000Z");
  });

  it("rolls GTFS times beyond 24:00 over to the next calendar day", () => {
    const date = serviceTimeToDate(regularDay, 25 * 3600 + 30 * 60);
    expect(date.toISOString()).toBe("2026-11-07T00:30:00.000Z");
    expect(formatClockTime(date)).toBe("01:30");
  });

  // GTFS defines the service day origin as "noon minus 12 h", which is 23:00 (not 00:00) local
  // time on the day clocks go forward and 01:00 on the day they go back.
  it("keeps 08:00 at 08:00 on the day clocks go forward", () => {
    const springForward = unixSeconds("2027-03-27T22:00:00Z");
    expect(formatClockTime(serviceTimeToDate(springForward, 8 * 3600))).toBe("08:00");
  });

  it("keeps 08:00 at 08:00 on the day clocks go back", () => {
    const fallBack = unixSeconds("2026-10-24T23:00:00Z");
    expect(formatClockTime(serviceTimeToDate(fallBack, 8 * 3600))).toBe("08:00");
  });
});

describe("formatClockTime", () => {
  it("always shows Europe/Paris time, whatever the machine time zone", () => {
    expect(formatClockTime(new Date("2026-07-01T12:00:00Z"))).toBe("14:00");
    expect(formatClockTime(new Date("2026-12-01T12:00:00Z"))).toBe("13:00");
  });

  it("uses a 24-hour clock with leading zeros", () => {
    expect(formatClockTime(new Date("2026-12-01T23:05:00Z"))).toBe("00:05");
  });
});

describe("minutesUntil", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("returns whole minutes until the departure", () => {
    expect(minutesUntil("2026-01-01T12:05:30Z", now)).toBe(5);
  });

  it("returns 0 for an imminent departure", () => {
    expect(minutesUntil("2026-01-01T12:00:40Z", now)).toBe(0);
  });

  it("never returns a negative value", () => {
    expect(minutesUntil("2026-01-01T11:58:00Z", now)).toBe(0);
  });
});

describe("serviceDayOrigin", () => {
  it("matches the serviceDay sent by the M API on a regular day", () => {
    expect(serviceDayOrigin("2026-11-06")).toBe(1793919600);
  });

  it("is 23:00 the evening before on the day clocks go forward", () => {
    expect(serviceDayOrigin("2027-03-28")).toBe(unixSeconds("2027-03-27T22:00:00Z"));
  });

  it("is 01:00 local on the day clocks go back", () => {
    expect(serviceDayOrigin("2026-10-25")).toBe(unixSeconds("2026-10-24T23:00:00Z"));
  });
});

describe("parisDate", () => {
  it("gives the calendar date in Grenoble, not in UTC", () => {
    expect(parisDate(new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-07");
    expect(parisDate(new Date("2026-11-06T22:30:00Z"))).toBe("2026-11-06");
  });
});

describe("parisDateTime", () => {
  it("reads a Grenoble wall-clock time in winter (UTC+1) and in summer (UTC+2)", () => {
    expect(parisDateTime("2026-11-07", "12:00").toISOString()).toBe("2026-11-07T11:00:00.000Z");
    expect(parisDateTime("2026-07-14", "09:30").toISOString()).toBe("2026-07-14T07:30:00.000Z");
  });
});
