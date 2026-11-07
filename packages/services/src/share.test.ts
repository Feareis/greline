import { describe, expect, it } from "vitest";
import { parseSharedSelection, sharedSelectionSearch } from "./share";

const network = { stops: [{ id: "SEM:GENCHAVANT" }, { id: "SEM:GENGAR" }], lines: [{ id: "SEM:A" }] };

describe("parseSharedSelection", () => {
  it("opens a known stop", () => {
    expect(parseSharedSelection("?stop=SEM%3AGENCHAVANT", network)).toEqual({ kind: "stop", id: "SEM:GENCHAVANT" });
    expect(parseSharedSelection("?stop=SEM:GENGAR&utm=x", network)).toEqual({ kind: "stop", id: "SEM:GENGAR" });
  });

  it("opens a known line", () => {
    expect(parseSharedSelection("?line=SEM%3AA", network)).toEqual({ kind: "line", id: "SEM:A" });
    expect(parseSharedSelection("?line=SEM:Z", network)).toBeNull();
  });

  it("prefers the stop when a link names both", () => {
    expect(parseSharedSelection("?line=SEM:A&stop=SEM:GENGAR", network)).toEqual({ kind: "stop", id: "SEM:GENGAR" });
  });

  it("ignores unknown stops and links without one", () => {
    expect(parseSharedSelection("?stop=SEM:NOWHERE", network)).toBeNull();
    expect(parseSharedSelection("?stop=", network)).toBeNull();
    expect(parseSharedSelection("", network)).toBeNull();
  });
});

describe("sharedSelectionSearch", () => {
  it("writes the stop, or nothing", () => {
    expect(sharedSelectionSearch({ kind: "stop", id: "SEM:GENCHAVANT" })).toBe("?stop=SEM%3AGENCHAVANT");
    expect(sharedSelectionSearch(null)).toBe("");
  });

  it("reads back what it writes", () => {
    for (const selection of [{ kind: "stop", id: "SEM:GENGAR" }, { kind: "line", id: "SEM:A" }] as const) {
      expect(parseSharedSelection(sharedSelectionSearch(selection), network)).toEqual(selection);
    }
  });
});
