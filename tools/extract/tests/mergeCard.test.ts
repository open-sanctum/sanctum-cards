import { describe, it, expect } from "vitest";
import { mergeCards } from "../src/enrich/mergeCard.js";
import type { NcdRecord } from "../src/input/ncd.js";
import type { CardTextRecord } from "../src/input/cardtext.js";

const ncd: NcdRecord[] = [
  { id: 4, name: "Wrack", raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"] },
  { id: 1000, name: "Mock Card", raw: ["1000", "1000", "0", "0", "s", "g", "1000", "Mock Card"] },
];

const cardText: CardTextRecord[] = [
  { id: 4, type_letter: "s", text: "Wrack spell text.", source_file: "CardTextC.txt", source_line: 1 },
  { id: 4, type_letter: "f", text: "Wrack flavor text.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1000, type_letter: "s", text: "Mock spell text.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1000, type_letter: "h", text: "Mock help text.", source_file: "CardTextA.txt", source_line: 2 },
];

describe("mergeCards", () => {
  it("joins by id using spell-text (type_letter === 's') entries", () => {
    const out = mergeCards(ncd, cardText);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: 4,
      name: "Wrack",
      rules_text: "Wrack spell text.",
      sources: { card_text_file: "CardTextC.txt", card_text_line: 1 },
    });
    expect(out[1]).toMatchObject({
      id: 1000,
      rules_text: "Mock spell text.",
      sources: { card_text_file: "CardTextA.txt", card_text_line: 1 },
    });
  });

  it("ignores non-spell type_letters (f/h/m/n)", () => {
    const out = mergeCards(ncd, cardText);
    for (const c of out) {
      expect(c.rules_text).not.toContain("flavor");
      expect(c.rules_text).not.toContain("help");
    }
  });

  it("sorts output by ascending id", () => {
    const out = mergeCards(ncd.slice().reverse(), cardText);
    expect(out.map((c) => c.id)).toEqual([4, 1000]);
  });

  it("warns and skips when an ncd id has no spell text", () => {
    const onlyText4: CardTextRecord[] = [
      { id: 4, type_letter: "s", text: "Wrack spell text.", source_file: "CardTextC.txt", source_line: 1 },
    ];
    const warnings: string[] = [];
    const out = mergeCards(ncd, onlyText4, { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(4);
    expect(warnings.some((w) => w.includes("1000") && /no spell text/i.test(w))).toBe(true);
  });

  it("warns (but does not throw) if a spell-text id is not in ncd", () => {
    const orphan: CardTextRecord = {
      id: 9999,
      type_letter: "s",
      text: "orphan spell",
      source_file: "CardTextA.txt",
      source_line: 99,
    };
    const warnings: string[] = [];
    const out = mergeCards(ncd, [...cardText, orphan], { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(2);
    expect(warnings.some((w) => w.includes("9999"))).toBe(true);
  });
});
