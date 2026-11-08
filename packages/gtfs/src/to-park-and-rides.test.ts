import { mParkingCountsSchema, mParkingsSchema } from "@greline/validation";
import { describe, expect, it, vi } from "vitest";
import countsSample from "./__fixtures__/m-parking-counts-sample.json";
import parkingsSample from "./__fixtures__/m-parkings-sample.json";
import { M_API } from "./fetch-network";
import { fetchParkAndRides } from "./fetch-park-and-rides";
import { parkingName, toParkAndRides } from "./to-park-and-rides";

// Real M answers (2026-11-08 ~03:05): Vallier-Catane and Eybens counted live (Eybens reports one
// space more than it has), Voiron without sensors, Allevard without P+R spaces, Chavant a city
// car park whose answer has no P+R field at all.
const parkings = mParkingsSchema.parse(parkingsSample);
const counts = mParkingCountsSchema.parse(countsSample);

describe("toParkAndRides", () => {
  const parkAndRides = toParkAndRides(parkings, counts);
  const byName = (name: string) => parkAndRides.find((p) => p.name === name);

  it("keeps the car parks with P+R spaces only", () => {
    expect(parkAndRides.map((p) => p.name)).toEqual(["Vallier-Catane", "Eybens - Le Verderet", "Pole d'Echange Voiron"]);
  });

  it("gives the P+R capacity, position and live count with its time", () => {
    expect(byName("Vallier-Catane")).toEqual({
      id: "38185-P-011",
      name: "Vallier-Catane",
      city: "Grenoble",
      lat: parkingsSample.features[0]!.geometry.coordinates[1],
      lon: parkingsSample.features[0]!.geometry.coordinates[0],
      capacity: 492,
      free: 290,
      updatedAt: new Date(countsSample["38185-P-011"].time).toISOString(),
    });
  });

  it("never shows more free spaces than the car park has", () => {
    expect(byName("Eybens - Le Verderet")).toMatchObject({ capacity: 43, free: 43 });
  });

  it("has no count nor time for a car park without sensors", () => {
    expect(byName("Pole d'Echange Voiron")).toMatchObject({ capacity: 472, free: null, updatedAt: null });
  });

  it("has no count for a car park missing from the live answer", () => {
    const [first] = toParkAndRides(parkings, {});
    expect(first).toMatchObject({ free: null, updatedAt: null });
  });
});

describe("parkingName", () => {
  it.each([
    ["VALLIER-CATANE", "Vallier-Catane"],
    ["EYBENS - LE VERDERET", "Eybens - Le Verderet"],
    ["LA TRONCHE - GRAND SABLON", "La Tronche - Grand Sablon"],
    ["POLE D'ECHANGE VOIRON", "Pole d'Echange Voiron"],
    ["PONT-DE-CLAIX L'\u00c9TOILE", "Pont-de-Claix l'\u00c9toile"],
    ["SAINT-MARTIN-D'H\u00c8RES", "Saint-Martin-d'H\u00e8res"],
  ])("writes %s as %s", (raw, expected) => {
    expect(parkingName(raw)).toBe(expected);
  });
});

describe("fetchParkAndRides", () => {
  const answering = (counts: Response) =>
    vi.fn(async (url: string) => (url === M_API.parkings ? Response.json(parkingsSample) : counts));

  it("asks for the car parks and their counts", async () => {
    const fetchFn = answering(Response.json(countsSample));
    const parkAndRides = await fetchParkAndRides(fetchFn);
    expect(fetchFn.mock.calls.map(([url]) => url).sort()).toEqual([M_API.parkingCounts, M_API.parkings].sort());
    expect(parkAndRides.find((p) => p.name === "Vallier-Catane")?.free).toBe(290);
  });

  it("shows every P+R with its capacity only when no count comes back", async () => {
    const parkAndRides = await fetchParkAndRides(answering(new Response(null, { status: 204 })));
    expect(parkAndRides).toHaveLength(3);
    expect(parkAndRides.every((p) => p.free === null)).toBe(true);
  });
});
