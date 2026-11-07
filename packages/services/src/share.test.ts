import { describe, expect, it } from "vitest";
import { parseSharedSelection, sharedSelectionSearch } from "./share";

const network = { stops: [{ id: "SEM:GENCHAVANT" }, { id: "SEM:GENGAR" }] };

describe("parseSharedSelection", () => {
  it("opens a known stop", () => {
    expect(parseSharedSelection("?stop=SEM%3AGENCHAVANT", network)).toEqual({ kind: "stop", id: "SEM:GENCHAVANT" });
    expect(parseSharedSelection("?stop=SEM:GENGAR&utm=x", network)).toEqual({ kind: "stop", id: "SEM:GENGAR" });
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
    const selection = { kind: "stop", id: "SEM:GENGAR" } as const;
    expect(parseSharedSelection(sharedSelectionSearch(selection), network)).toEqual(selection);
  });
});
