import { describe, it, expect } from "vitest";
import { mergeCards } from "../src/enrich/mergeCard.js";
import type { NcdRecord } from "../src/input/ncd.js";
import type { CardTextRecord } from "../src/input/cardtext.js";

const ncd: NcdRecord[] = [
  // Wrack: alteration (a), minion target (m)
  { id: 4, name: "Wrack", raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"] },
  // Nightmare: summoning (s), group target (M)
  { id: 1026, name: "Nightmare", raw: ["1026", "1026", "0", "0", "s", "M", "1026", "Nightmare"] },
];

const cardText: CardTextRecord[] = [
  { id: 4, type_letter: "s", text: "Cast on minion. Dispels all individual spells on minion.", source_file: "CardTextC.txt", source_line: 1 },
  { id: 4, type_letter: "f", text: "Wrack flavor.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1026, type_letter: "s", text: "H:3 A:1 HP:10 L:2 Nomadic. At start of combat against recruits, Nightmare casts Despond.", source_file: "CardTextA.txt", source_line: 27 },
];

describe("mergeCards (v1)", () => {
  it("derives type and target from .ncd letter columns", () => {
    const out = mergeCards(ncd, cardText);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: 4, type: "alteration", target: "minion" });
    expect(out[1]).toMatchObject({ id: 1026, type: "summoning", target: "group" });
  });

  it("parses stats from rules text", () => {
    const out = mergeCards(ncd, cardText);
    expect(out[1].stats).toEqual({ hand_damage: 3, missile: null, hp_max: 10, level: 2, attack_rate: 1 });
    expect(out[0].stats).toBeNull();
  });

  it("parses keywords against the allowlist", () => {
    const out = mergeCards(ncd, cardText);
    expect(out[1].keywords).toContain("Nomadic");
  });

  it("sets cost / rarity / set to null (deferred to M2.5-RE)", () => {
    const out = mergeCards(ncd, cardText);
    expect(out[0].cost).toEqual({ total: null, primary: null, secondary: null, tertiary: null });
    expect(out[0].rarity).toBeNull();
    expect(out[0].set).toBeNull();
  });

  it("populates effect_record_id and related_card_id from .ncd cols 3,4", () => {
    const withEffects: NcdRecord[] = [
      { id: 87, name: "Inundate", raw: ["87", "87", "4100", "0", "m", "q", "87", "Inundate"] },
      { id: 615, name: "Sword of Zana II", raw: ["615", "615", "0", "22", "c", "r", "615", "Sword of Zana II"] },
    ];
    const withEffectsText: CardTextRecord[] = [
      { id: 87, type_letter: "s", text: "Cast on square. Square becomes water.", source_file: "CardTextA.txt", source_line: 1 },
      { id: 615, type_letter: "s", text: "Cast on recruit. Gets +1 hand damage.", source_file: "CardTextA.txt", source_line: 2 },
    ];
    const out = mergeCards(withEffects, withEffectsText);
    expect(out[0].effect_record_id).toBe(4100);
    expect(out[0].related_card_id).toBeNull();
    expect(out[1].effect_record_id).toBeNull();
    expect(out[1].related_card_id).toBe(22);
  });

  it("populates art paths when art ids are provided", () => {
    const out = mergeCards(ncd, cardText, {
      bigArtIds: new Set(["1026"]),
      smallArtIds: new Set(["4", "1026"]),
    });
    expect(out[0].art).toEqual({ big: null, small: "assets/art/small/4.png" });
    expect(out[1].art).toEqual({ big: "assets/art/big/1026.png", small: "assets/art/small/1026.png" });
  });

  it("populates audio when audio ids are provided", () => {
    const out = mergeCards(ncd, cardText, { audioIds: new Set(["1026"]) });
    expect(out[0].audio).toBeNull();
    expect(out[1].audio).toBe("assets/sounds/1026.wav");
  });

  it("populates starter_decks when starterDecks map is provided", () => {
    const out = mergeCards(ncd, cardText, {
      starterDecks: new Map([[1026, ["despair"]]]),
    });
    expect(out[0].starter_decks).toEqual([]);
    expect(out[1].starter_decks).toEqual(["despair"]);
  });

  it("warns and skips cards with unmapped letters", () => {
    const bad: NcdRecord[] = [{ id: 999, name: "Bad", raw: ["999", "999", "0", "0", "X", "Y", "999", "Bad"] }];
    const badText: CardTextRecord[] = [{ id: 999, type_letter: "s", text: "Cast on globe.", source_file: "CardTextA.txt", source_line: 99 }];
    const warnings: string[] = [];
    const out = mergeCards(bad, badText, { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(0);
    expect(warnings.some((w) => w.includes("type letter"))).toBe(true);
  });

  it("sorts output by ascending id", () => {
    const out = mergeCards(ncd.slice().reverse(), cardText);
    expect(out.map((c) => c.id)).toEqual([4, 1026]);
  });
});
