import { describe, it, expect } from "vitest";
import { parseKeywords } from "../src/enrich/parseKeywords.js";

const allowlist = ["Flight", "Mountainwalk", "Nomadic", "Concealed", "Veteran", "Field Armor"];

describe("parseKeywords", () => {
  it("extracts keywords from the allowlist as whole words", () => {
    expect(parseKeywords("H:3 A:1 HP:10 L:2 Nomadic. ...", allowlist)).toEqual(["Nomadic"]);
  });

  it("matches multiple keywords", () => {
    const text = "Group gains Flight. ... Mountainwalk... ";
    expect(parseKeywords(text, allowlist)).toEqual(["Flight", "Mountainwalk"]);
  });

  it("deduplicates", () => {
    expect(parseKeywords("Flight ... Flight ...", allowlist)).toEqual(["Flight"]);
  });

  it("respects word boundaries", () => {
    expect(parseKeywords("Mountainwalker test", allowlist)).toEqual([]);
    expect(parseKeywords("Mountainwalk test", allowlist)).toEqual(["Mountainwalk"]);
  });

  it("handles multi-word keywords", () => {
    expect(parseKeywords("recruit gets Field Armor (+1 armor)", allowlist)).toEqual(["Field Armor"]);
  });

  it("returns an empty array for cards with no keywords", () => {
    expect(parseKeywords("Cast on globe. Some effect.", allowlist)).toEqual([]);
  });

  it("returns a sorted array", () => {
    expect(parseKeywords("Veteran, Flight, Nomadic", allowlist)).toEqual(["Flight", "Nomadic", "Veteran"]);
  });
});
