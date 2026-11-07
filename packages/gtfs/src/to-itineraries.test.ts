import { mPlanSchema } from "@greline/validation";
import { describe, expect, it, vi } from "vitest";
import sample from "./__fixtures__/m-plan-sample.json";
import { fetchItineraries } from "./fetch-itineraries";
import { toItineraries } from "./to-itineraries";

// Real M planner answer (2026-11-07 ~10:58), Universite - Bibliotheques to Echirolles La Rampe:
// bus C10 alone, then tram C with a change to tram A.
const plan = mPlanSchema.parse(sample);

describe("toItineraries", () => {
  const itineraries = toItineraries(plan);

  it("keeps every itinerary, in the planner's order", () => {
    expect(itineraries).toHaveLength(2);
    expect(itineraries.map((it) => it.rides.map((ride) => ride.shortName))).toEqual([["C10"], ["C", "A"]]);
  });

  it("describes each ride with its line, direction, stops and times", () => {
    const bus = sample.plan.itineraries[0]!.legs[1]!;
    expect(itineraries[0]!.rides[0]).toEqual({
      shortName: "C10",
      color: "EF7C00",
      textColor: "FFFFFF",
      headsign: bus.headsign,
      from: bus.from.name.split(", ")[1],
      to: bus.to.name.split(", ")[1],
      departureTime: new Date(bus.startTime).toISOString(),
      arrivalTime: new Date(bus.endTime).toISOString(),
      realtime: false,
    });
  });

  it("spans the whole trip, walks included, and counts the walking time", () => {
    const [first] = itineraries;
    const legs = sample.plan.itineraries[0]!;
    expect(first!.departureTime).toBe(new Date(legs.startTime).toISOString());
    expect(first!.arrivalTime).toBe(new Date(legs.endTime).toISOString());
    expect(first!.walkSeconds).toBe(legs.walkTime);
  });

  it("names stops without their city, like the rest of the site", () => {
    expect(itineraries[1]!.rides[0]!.to).toBe("Chavant");
  });

  // Seen on real data: Gares to Grand'place, a 58 min walk listed before a 23 min tram ride.
  describe("walking all the way", () => {
    const walk = (startTime: number, endTime: number) => ({
      startTime,
      endTime,
      walkTime: (endTime - startTime) / 1000,
      legs: [{ mode: "WALK", transitLeg: false, startTime, endTime, realTime: false, from: { name: "Origin" }, to: { name: "Destination" } }],
    });
    const ride = sample.plan.itineraries[0]!;
    const withWalk = (startTime: number, endTime: number) =>
      toItineraries(mPlanSchema.parse({ plan: { itineraries: [walk(startTime, endTime), ride] } }));

    it("is dropped when a ride arrives sooner", () => {
      expect(withWalk(ride.startTime, ride.endTime + 60_000).map((it) => it.rides.length)).toEqual([1]);
    });

    it("is kept when it arrives first", () => {
      expect(withWalk(ride.startTime, ride.endTime - 60_000).map((it) => it.rides.length)).toEqual([0, 1]);
    });
  });

  it("finds nothing when the planner reports an error", () => {
    const failed = mPlanSchema.parse({ plan: { itineraries: [] }, error: { message: "PATH_NOT_FOUND" } });
    expect(toItineraries(failed)).toEqual([]);
  });
});

describe("fetchItineraries", () => {
  it("asks the M planner between the two places, with the origin header", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(sample));
    const itineraries = await fetchItineraries({ lat: 45.1925, lon: 5.7716 }, { lat: 45.1467, lon: 5.7184 }, fetchSpy);
    expect(itineraries).toHaveLength(2);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(
      "https://data.mobilites-m.fr/api/routers/default/plan?fromPlace=45.1925,5.7716&toPlace=45.1467,5.7184&mode=WALK,TRANSIT&numItineraries=3",
    );
    expect(new Headers(init?.headers).get("origin")).toBe("greline");
  });
});
