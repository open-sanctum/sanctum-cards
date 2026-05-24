import { describe, it, expect } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../data/schema.json");

const validSample = {
  id: 1026,
  name: "Nightmare",
  type: "summoning",
  target: "group",
  cost: { total: null, primary: null, secondary: null, tertiary: null },
  rarity: null,
  set: null,
  stats: { hand_damage: 3, missile: null, hp_max: 10, level: 2, attack_rate: 1 },
  keywords: ["Nomadic"],
  rules_text: "H:3 A:1 HP:10 L:2 Nomadic. ...",
  art: { big: "assets/art/big/1026.png", small: "assets/art/small/1026.png" },
  audio: null,
  starter_decks: ["despair"],
  effect_record_id: null,
  related_card_id: null,
  sources: { ncd_row: 27, card_text_file: "CardTextA.txt", card_text_line: 27 },
};

function compile() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats.default(ajv);
  return ajv.compile(schema);
}

describe("schema.json", () => {
  it("validates a well-formed card", () => {
    const validate = compile();
    const ok = validate(validSample);
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });

  it("rejects an invalid type value", () => {
    const validate = compile();
    const ok = validate({ ...validSample, type: "not-a-type" });
    expect(ok).toBe(false);
    expect(validate.errors?.some((e) => e.instancePath === "/type")).toBe(true);
  });

  it("rejects an invalid target value", () => {
    const validate = compile();
    const ok = validate({ ...validSample, target: "not-a-target" });
    expect(ok).toBe(false);
  });

  it("rejects negative card id", () => {
    const validate = compile();
    const ok = validate({ ...validSample, id: -1 });
    expect(ok).toBe(false);
  });

  it("accepts a card with null stats", () => {
    const validate = compile();
    const ok = validate({ ...validSample, stats: null });
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });

  it("accepts cost with all null fields (cost data deferred to M2.5-RE)", () => {
    const validate = compile();
    expect(validate({ ...validSample, cost: { total: null, primary: null, secondary: null, tertiary: null } })).toBe(true);
  });

  it("rejects a card with house field (house is deck-level, not card-level)", () => {
    const validate = compile();
    const ok = validate({ ...validSample, house: "despair" });
    expect(ok).toBe(false);
  });

  it("accepts an empty starter_decks array", () => {
    const validate = compile();
    expect(validate({ ...validSample, starter_decks: [] })).toBe(true);
  });
});
