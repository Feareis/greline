import { describe, expect, it } from "vitest";
import { nextWebVersion, setVersion } from "./version-rules.mjs";

describe("nextWebVersion", () => {
  it("adds one to the patch when the commit touches the web app", () => {
    const files = ["apps/web/src/app/page.tsx"];
    expect(nextWebVersion({ files, headVersion: "1.7.5", stagedVersion: "1.7.5" })).toBe("1.7.6");
  });

  it("counts shared packages, which ship inside the web app", () => {
    const files = ["packages/services/src/time.ts"];
    expect(nextWebVersion({ files, headVersion: "1.7.9", stagedVersion: "1.7.9" })).toBe("1.7.10");
  });

  it("ignores commits that only touch docs, CI or the mobile app", () => {
    const files = ["README.md", ".github/workflows/ci.yml", "apps/mobile/app.json"];
    expect(nextWebVersion({ files, headVersion: "1.7.5", stagedVersion: "1.7.5" })).toBeNull();
  });

  it("keeps a version set by hand (new stage)", () => {
    const files = ["apps/web/package.json"];
    expect(nextWebVersion({ files, headVersion: "1.7.5", stagedVersion: "1.8.0" })).toBeNull();
  });

  it("rejects a version that is not MAJOR.MINOR.PATCH", () => {
    const files = ["apps/web/package.json"];
    expect(() => nextWebVersion({ files, headVersion: "1.7", stagedVersion: "1.7" })).toThrow(/1\.7/);
  });
});

describe("setVersion", () => {
  it("replaces only the version field and keeps the formatting", () => {
    const json = '{\r\n  "name": "@greline/web",\r\n  "version": "1.7.5",\r\n  "private": true\r\n}\r\n';
    expect(setVersion(json, "1.7.6")).toBe(json.replace("1.7.5", "1.7.6"));
  });
});
