import { describe, it, expect } from "vitest";
import { parseNcd } from "../src/input/ncd.js";

const SAMPLE = `   4\t   4\t   0\t  0\ta\tm\t   4\tWrack
   5\t   5\t   0\t  0\tm\tR\t   5\tForced March
   9\t   9\t4100\t  0\tc\tg\t   9\tDeluge
`;

describe("parseNcd", () => {
  it("returns one record per non-empty line", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out).toHaveLength(3);
  });

  it("extracts id and name", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out[0]).toMatchObject({ id: 4, name: "Wrack" });
    expect(out[1]).toMatchObject({ id: 5, name: "Forced March" });
    expect(out[2]).toMatchObject({ id: 9, name: "Deluge" });
  });

  it("preserves raw columns for later analysis", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out[2].raw).toEqual(["9", "9", "4100", "0", "c", "g", "9", "Deluge"]);
  });

  it("ignores blank lines and trailing whitespace", () => {
    const out = parseNcd(Buffer.from(`\n${SAMPLE}\n\n`));
    expect(out).toHaveLength(3);
  });

  it("throws on malformed rows (fewer than 8 columns)", () => {
    expect(() => parseNcd(Buffer.from("   1\tonly two cols\n"))).toThrow(
      /malformed|columns/i
    );
  });
});
