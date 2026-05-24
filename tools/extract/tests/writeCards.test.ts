import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCardsBulk } from "../src/output/writeCards.js";
import type { CardV0 } from "../src/enrich/mergeCard.js";

const sample: CardV0[] = [
  {
    id: 4,
    name: "Wrack",
    rules_text: "Wrack text.",
    ncd_raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"],
    sources: { ncd_row: 1, card_text_file: "CardTextA.txt", card_text_line: 1 },
  },
];

describe("writeCardsBulk", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sanctum-cards-"));
  });

  it("writes cards.json with sorted keys and indentation", () => {
    writeCardsBulk(sample, dir);
    const content = readFileSync(join(dir, "cards.json"), "utf8");
    expect(content).toContain('"id": 4');
    expect(content).toContain('"name": "Wrack"');
    // Sorted keys: id before name before ncd_raw before rules_text before sources
    const idIndex = content.indexOf('"id"');
    const nameIndex = content.indexOf('"name"');
    expect(idIndex).toBeLessThan(nameIndex);
    rmSync(dir, { recursive: true, force: true });
  });

  it("output is byte-identical across runs", () => {
    writeCardsBulk(sample, dir);
    const first = readFileSync(join(dir, "cards.json"));
    writeCardsBulk(sample, dir);
    const second = readFileSync(join(dir, "cards.json"));
    expect(first.equals(second)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
