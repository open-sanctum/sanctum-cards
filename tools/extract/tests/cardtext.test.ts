import { describe, it, expect } from "vitest";
import { parseCardText } from "../src/input/cardtext.js";

const SAMPLE = `1\t1000\ts\tCast on globe. Every non-friendly town and colony...
2\t1001\ts\tCast on globe. After start of next turn, all Imps...
3\t1002\ts\tCast on group. Group dies. The Pact Is Sealed...
`;

describe("parseCardText", () => {
  it("returns one record per line", () => {
    const out = parseCardText(Buffer.from(SAMPLE), "CardTextA.txt");
    expect(out).toHaveLength(3);
  });

  it("extracts id, type letter, and text", () => {
    const [first] = parseCardText(Buffer.from(SAMPLE), "CardTextA.txt");
    expect(first).toMatchObject({
      id: 1000,
      type_letter: "s",
      text: "Cast on globe. Every non-friendly town and colony...",
      source_file: "CardTextA.txt",
      source_line: 1,
    });
  });

  it("preserves embedded tabs, slashes, and punctuation in the text column", () => {
    const sample = `1\t1\ts\tFoo\\tBar (parenthetical) - hyphen, "quoted", 'apostrophe'\n`;
    const [rec] = parseCardText(Buffer.from(sample), "CardTextA.txt");
    expect(rec.text).toBe("Foo\\tBar (parenthetical) - hyphen, \"quoted\", 'apostrophe'");
  });

  it("ignores blank lines", () => {
    const out = parseCardText(Buffer.from(`${SAMPLE}\n\n`), "CardTextA.txt");
    expect(out).toHaveLength(3);
  });
});
