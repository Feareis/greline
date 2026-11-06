import { cumulativeDistances } from "@greline/services";
import type { LonLat } from "@greline/types";
import { describe, expect, it } from "vitest";
import { readShapes, simplifyPolyline, stopDistancesAlong } from "./shapes";

describe("readShapes", () => {
  const text = [
    "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled",
    "7,45.19,5.72,2,",
    "8,45.00,5.00,1,",
    "7,45.18,5.71,1,",
    "",
  ].join("\r\n");

  it("returns the requested shapes as [lon, lat], in sequence order", () => {
    expect(readShapes(text, new Set(["7"]))).toEqual(
      new Map([
        [
          "7",
          [
            [5.71, 45.18],
            [5.72, 45.19],
          ],
        ],
      ]),
    );
  });
});

describe("simplifyPolyline", () => {
  it("drops points within the tolerance and keeps real bends", () => {
    const line: LonLat[] = [
      [5.72, 45.18],
      [5.72, 45.180001], // duplicate-ish: under 1 m off the straight line, dropped
      [5.72, 45.18],
      [5.7200001, 45.185], // ~1 cm off the straight line: dropped
      [5.72, 45.19],
      [5.73, 45.19], // a right-angle bend: kept
    ];
    expect(simplifyPolyline(line, 2)).toEqual([
      [5.72, 45.18],
      [5.72, 45.19],
      [5.73, 45.19],
    ]);
  });

  it("keeps a two-point line as is", () => {
    const line: LonLat[] = [
      [5.72, 45.18],
      [5.73, 45.18],
    ];
    expect(simplifyPolyline(line, 2)).toEqual(line);
  });
});

describe("stopDistancesAlong", () => {
  // North for ~1112 m, then east.
  const track: LonLat[] = [
    [5.72, 45.18],
    [5.72, 45.19],
    [5.73, 45.19],
  ];
  const cumulative = cumulativeDistances(track);

  it("measures each stop from the start of the track, projecting platforms beside it", () => {
    const [first, middle, corner] = stopDistancesAlong(track, cumulative, [
      [5.72, 45.18],
      [5.7201, 45.185], // a platform ~8 m beside the track
      [5.72, 45.19],
    ]);
    expect(first).toBeCloseTo(0, 6);
    expect(middle).toBeCloseTo(cumulative[1]! / 2, 0);
    expect(corner).toBeCloseTo(cumulative[1]!, 6);
  });

  it("never goes backwards, even when a later stop is nearer an earlier part of the track", () => {
    const distances = stopDistancesAlong(track, cumulative, [
      [5.725, 45.19],
      [5.72, 45.181],
    ]);
    expect(distances[1]).toBeGreaterThanOrEqual(distances[0]!);
  });
});
