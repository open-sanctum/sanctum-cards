import { describe, it, expect } from "vitest";
import { decodeImage, decodeImageToPng } from "../src/input/images.js";
import { openZip, readZipEntry } from "../src/input/zip.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("decodeImageToPng", () => {
  it("converts a renamed-JPEG .bm_ to PNG", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1026.bm_");
    const png = await decodeImageToPng(buf);
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });

  it("converts a 24-bit BMP .bmp to PNG", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1045.bmp");
    const { png, width, height } = await decodeImage(buf);
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(width).toBe(188);
    expect(height).toBe(250);
  });

  it("converts a 32-bit V4 BMP .bmp to PNG with multi-color content", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1039.bmp");
    const { png, width, height } = await decodeImage(buf);
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(width).toBe(188);
    expect(height).toBe(250);
    // Card art is photographic — a real decode produces many distinct
    // colors. A monochrome or all-one-channel result would be a regression.
    expect(png.length).toBeGreaterThan(5000);
  });

  it("produces byte-identical output for the same input", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1026.bm_");
    const a = await decodeImageToPng(buf);
    const b = await decodeImageToPng(buf);
    expect(a.equals(b)).toBe(true);
  });
});
