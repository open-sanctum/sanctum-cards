import { describe, it, expect } from "vitest";
import { mergeCards } from "../src/enrich/mergeCard.js";
import type { NcdRecord } from "../src/input/ncd.js";
import type { CardTextRecord } from "../src/input/cardtext.js";

const ncd: NcdRecord[] = [
  { id: 4, name: "Wrack", raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"] },
  { id: 1000, name: "Mock Card", raw: ["1000", "1000", "0", "0", "s", "g", "1000", "Mock Card"] },
];

const cardText: CardTextRecord[] = [
  { id: 4, type_letter: "a", text: "Wrack text.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1000, type_letter: "s", text: "Mock text.", source_file: "CardTextA.txt", source_line: 1 },
];

describe("mergeCards", () => {
  it("joins by id", () => {
    const out = mergeCards(ncd, cardText);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: 4,
      name: "Wrack",
      rules_text: "Wrack text.",
      sources: { card_text_file: "CardTextA.txt", card_text_line: 1 },
    });
  });

  it("sorts output by ascending id", () => {
    const out = mergeCards(ncd.slice().reverse(), cardText);
    expect(out.map((c) => c.id)).toEqual([4, 1000]);
  });

  it("warns (but does not throw) if an ncd id has no card text, and omits it from output", () => {
    const warnings: string[] = [];
    const out = mergeCards(ncd, [cardText[0]!], { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(1);
    expect(warnings.some((w) => w.includes("1000"))).toBe(true);
  });

  it("warns (but does not throw) if a card text id is not in ncd", () => {
    const orphan: CardTextRecord = {
      id: 9999,
      type_letter: "s",
      text: "orphan",
      source_file: "CardTextA.txt",
      source_line: 99,
    };
    const warnings: string[] = [];
    const out = mergeCards(ncd, [...cardText, orphan], { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(2);
    expect(warnings.some((w) => w.includes("9999"))).toBe(true);
  });
});
