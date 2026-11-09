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

  it("opens a vehicle named by its trip and start, whatever the network", () => {
    expect(parseSharedSelection("?vehicle=SEM%3A32165104%401793919600", network)).toEqual({ kind: "vehicle", id: "SEM:32165104@1793919600" });
    expect(parseSharedSelection("?line=SEM:A&vehicle=SEM:1@2", network)).toEqual({ kind: "line", id: "SEM:A" });
  });

  it("ignores a vehicle key that is not one", () => {
    for (const bad of ["SEM:1", "SEM:1@", "@1", "SEM:1@12a", "../x@1", `SEM:${"1".repeat(65)}@1`]) {
      expect(parseSharedSelection(`?${new URLSearchParams({ vehicle: bad })}`, network)).toBeNull();
    }
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
    const selections = [
      { kind: "stop", id: "SEM:GENGAR" },
      { kind: "line", id: "SEM:A" },
      { kind: "vehicle", id: "SEM:32165104@1793919600" },
    ] as const;
    for (const selection of selections) {
      expect(parseSharedSelection(sharedSelectionSearch(selection), network)).toEqual(selection);
    }
  });
});
