import { describe, it, expect } from "vitest";
import { readZipEntry, openZip } from "../src/input/zip.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");

describe("zip", () => {
  it("opens the input zip without error", () => {
    const zip = openZip(ZIP_PATH);
    expect(zip).toBeDefined();
  });

  it("reads Cache/Sanctum.ncd as a non-empty buffer", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/Cache/Sanctum.ncd");
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 4).toString("ascii")).toMatch(/^\s+\d/);
  });

  it("throws if the entry is missing", () => {
    const zip = openZip(ZIP_PATH);
    expect(() => readZipEntry(zip, "does/not/exist")).toThrow(/not found/i);
  });
});
