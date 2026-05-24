import { describe, it, expect } from "vitest";
import { parseCardText } from "../src/input/cardtext.js";

const SAMPLE = `1000\ts\tCast on globe. Every non-friendly town and colony...
1001\ts\tCast on globe. After start of next turn, all Imps...
1002\ts\tCast on group. Group dies. The Pact Is Sealed...
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
    const sample = `1\ts\tFoo\\tBar (parenthetical) - hyphen, "quoted", 'apostrophe'\n`;
    const [rec] = parseCardText(Buffer.from(sample), "CardTextA.txt");
    expect(rec.text).toBe("Foo\\tBar (parenthetical) - hyphen, \"quoted\", 'apostrophe'");
  });

  it("ignores blank lines and assigns source_line by file position", () => {
    const sample = `\n${SAMPLE}\n\n`;
    const out = parseCardText(Buffer.from(sample), "CardTextA.txt");
    expect(out).toHaveLength(3);
    // After the leading blank line, the first record is on file-line 2.
    expect(out[0].source_line).toBe(2);
  });
});
