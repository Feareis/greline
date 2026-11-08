import { describe, expect, it } from "vitest";
import { parkAndRideLevel, parkAndRidesNearStops } from "./park-and-ride";

describe("parkAndRideLevel", () => {
  it("is unknown without a live count", () => {
    expect(parkAndRideLevel({ free: null, capacity: 472 })).toBe("unknown");
  });

  it("is full with no free space", () => {
    expect(parkAndRideLevel({ free: 0, capacity: 95 })).toBe("full");
  });

  it("is almost full under 10 spaces or a tenth of the car park", () => {
    expect(parkAndRideLevel({ free: 9, capacity: 43 })).toBe("almostFull");
    expect(parkAndRideLevel({ free: 40, capacity: 492 })).toBe("almostFull");
    expect(parkAndRideLevel({ free: 10, capacity: 43 })).toBe("available");
    expect(parkAndRideLevel({ free: 290, capacity: 492 })).toBe("available");
  });
});

describe("parkAndRidesNearStops", () => {
  // Esplanade P+R and its stop 31 m away; Voiron P+R 10 km from the network.
  const esplanade = { id: "esplanade", name: "Esplanade", city: "Grenoble", lat: 45.1985, lon: 5.7135, capacity: 95, free: 95, updatedAt: null };
  const voiron = { ...esplanade, id: "voiron", name: "Voiron", lat: 45.3669, lon: 5.5862 };
  const stop = { id: "SEM:CASAMAURES", name: "Casamaures", city: "Grenoble", lat: 45.1988, lon: 5.7136 };

  it("keeps the P+R a short walk from a stop of the network, drops the others", () => {
    expect(parkAndRidesNearStops([esplanade, voiron], [stop]).map((p) => p.id)).toEqual(["esplanade"]);
  });

  it("drops a P+R 600 m from the nearest stop", () => {
    const farStop = { ...stop, lat: stop.lat + 0.0054 };
    expect(parkAndRidesNearStops([esplanade], [farStop])).toEqual([]);
  });
});
