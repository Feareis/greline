import type { NetworkLine, Stop, TramNetwork } from "@greline/types";
import { describe, expect, it } from "vitest";
import { buildSchematicMap, groupLinesByStation } from "./build-map";
import { SCHEMATIC_GRID } from "./grid";

const stop = (id: string, lon: number, lat: number): Stop => ({ id, name: id, city: "Grenoble", lat, lon });

const line = (id: string, stopIds: string[]): NetworkLine => ({
  id,
  shortName: id,
  longName: id,
  mode: "tram",
  color: "3376B8",
  textColor: "FFFFFF",
  stopIds,
  shape: [],
});

// A cross: line A runs west-east, line B north-south, both through "center".
const network: TramNetwork = {
  stops: [
    stop("west", 5.7, 45.18),
    stop("center", 5.72, 45.18),
    stop("east", 5.74, 45.18),
    stop("north", 5.72, 45.2),
    stop("south", 5.72, 45.16),
  ],
  lines: [line("A", ["west", "center", "east"]), line("B", ["north", "center", "south"])],
};

describe("groupLinesByStation", () => {
  it("lists the lines serving each station, flagging transfers", () => {
    const byStation = groupLinesByStation(network.lines);
    expect(byStation.get("center")).toEqual(["A", "B"]);
    expect(byStation.get("west")).toEqual(["A"]);
  });
});

describe("buildSchematicMap", () => {
  const map = buildSchematicMap(network);

  it("places every served station once, on the grid, inside the map", () => {
    expect(map.stations.map((s) => s.stopId).sort()).toEqual(["center", "east", "north", "south", "west"]);
    for (const { position } of map.stations) {
      expect(position.x % SCHEMATIC_GRID).toBe(0);
      expect(position.y % SCHEMATIC_GRID).toBe(0);
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
      expect(position.x).toBeLessThan(map.width);
      expect(position.y).toBeLessThan(map.height);
    }
  });

  it("keeps the geographic arrangement (north is up, west is left)", () => {
    const at = (id: string) => map.stations.find((s) => s.stopId === id)!.position;
    expect(at("north").y).toBeLessThan(at("center").y);
    expect(at("west").x).toBeLessThan(at("center").x);
  });

  it("marks the shared station as a transfer", () => {
    expect(map.stations.find((s) => s.stopId === "center")!.lineIds).toEqual(["A", "B"]);
  });

  it("draws one path per line", () => {
    expect(map.paths.map((p) => p.lineId)).toEqual(["A", "B"]);
  });

  it("ignores stops served by no line", () => {
    const withOrphan = { ...network, stops: [...network.stops, stop("orphan", 5.9, 45.3)] };
    expect(buildSchematicMap(withOrphan).stations).toHaveLength(5);
  });
});
