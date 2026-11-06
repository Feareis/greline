import { describe, expect, it } from "vitest";
import tiny from "./__fixtures__/tiny-zip.json";
import { readZipText } from "./zip";

const tinyZip = Uint8Array.from(atob(tiny.base64), (char) => char.charCodeAt(0));

describe("readZipText", () => {
  it("extracts the requested files as text", async () => {
    const files = await readZipText(tinyZip, ["routes.txt", "big.txt"]);
    expect(files.get("routes.txt")).toBe("route_id,route_short_name,route_type\n91,A,0\n1,C1,3\n");
    expect(files.get("big.txt")).toHaveLength(5001);
  });

  it("only inflates the files it is asked for", async () => {
    const files = await readZipText(tinyZip, ["routes.txt"]);
    expect([...files.keys()]).toEqual(["routes.txt"]);
  });

  it("fails loudly when a requested file is missing", async () => {
    await expect(readZipText(tinyZip, ["stop_times.txt"])).rejects.toThrow(/stop_times\.txt/);
  });

  it("rejects data that is not a zip archive", async () => {
    await expect(readZipText(new TextEncoder().encode("not a zip"), ["routes.txt"])).rejects.toThrow(/zip/i);
  });
});
