import type { Line, Stop } from "@greline/types";
import { describe, expect, it } from "vitest";
import { normalizeName, searchNetwork } from "./search";

const stop = (id: string, name: string, city = "Grenoble"): Stop => ({ id, name, city, lat: 45, lon: 5 });
const line = (id: string, shortName: string): Line =>
  ({ id, shortName, longName: "", mode: "tram", network: "tram", color: "000000", textColor: "FFFFFF" }) as Line;

const network = {
  lines: [line("SEM:A", "A"), line("SEM:C", "C"), line("SEM:C1", "C1"), line("SEM:C14", "C14")],
  stops: [
    stop("SEM:GENGPL", "Grand'place"),
    stop("SEM:GENGAR", "Gares"),
    stop("SEM:ECHGAR", "Echirolles Gare", "\u00c9chirolles"),
    stop("SEM:GENETO", "L'\u00c9toile", "Le Pont-de-Claix"),
    stop("SEM:GENCHV", "Chavant"),
    stop("SEM:GENVIC", "Victor Hugo"),
    stop("SEM:MEYBOU", "Le Bourg", "Meylan"),
    stop("SEM:SEYBOU", "Le Bourg", "Seyssins"),
  ],
};

const ids = (query: string) => searchNetwork(query, network).map((r) => (r.kind === "line" ? r.line.id : r.stop.id));

describe("normalizeName", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalizeName("L'\u00c9toile")).toBe("l etoile");
    expect(normalizeName("  Grand\u2019place \u2013 Nord ")).toBe("grand place nord");
  });
});

describe("searchNetwork", () => {
  it("finds nothing for an empty query", () => {
    expect(searchNetwork("  ", network)).toEqual([]);
  });

  it("puts the line named exactly first, then lines starting with the query", () => {
    expect(ids("c1")).toEqual(["SEM:C1", "SEM:C14"]);
    expect(ids("C").slice(0, 3)).toEqual(["SEM:C", "SEM:C1", "SEM:C14"]);
  });

  it("finds stops whatever the accents and apostrophes", () => {
    expect(ids("etoile")).toEqual(["SEM:GENETO"]);
    expect(ids("grand place")).toEqual(["SEM:GENGPL"]);
    expect(ids("grandp")).toEqual(["SEM:GENGPL"]);
  });

  it("ranks names starting with the query before names merely containing a word", () => {
    expect(ids("gare")).toEqual(["SEM:GENGAR", "SEM:ECHGAR"]);
  });

  it("matches words in any order, the city included", () => {
    expect(ids("hugo vic")).toEqual(["SEM:GENVIC"]);
    expect(ids("bourg meylan")).toEqual(["SEM:MEYBOU"]);
  });

  it("keeps homonyms apart and caps the results", () => {
    expect(ids("le bourg")).toEqual(["SEM:MEYBOU", "SEM:SEYBOU"]);
    expect(searchNetwork("c", network, 2)).toHaveLength(2);
  });

  it("can leave lines out", () => {
    expect(searchNetwork("c", network, 8, { lines: false }).every((r) => r.kind === "stop")).toBe(true);
  });
});
