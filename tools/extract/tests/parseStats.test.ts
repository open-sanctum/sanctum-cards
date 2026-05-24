import { describe, it, expect } from "vitest";
import { parseStats } from "../src/enrich/parseStats.js";

describe("parseStats", () => {
  it("extracts H/A/HP/L from a typical creature line", () => {
    expect(parseStats("H:3 A:1 HP:10 L:2 Nomadic. ...")).toEqual({
      hand_damage: 3, missile: null, hp_max: 10, level: 2, attack_rate: 1,
    });
  });

  it("extracts M (missile) instead of H for archers", () => {
    expect(parseStats("M:2 A:0 HP:7 L:1 Cast on globe. ...")).toEqual({
      hand_damage: null, missile: 2, hp_max: 7, level: 1, attack_rate: 0,
    });
  });

  it("returns null when the leading stat block is absent", () => {
    expect(parseStats("Cast on globe. ...")).toBeNull();
    expect(parseStats("")).toBeNull();
    expect(parseStats("When any player casts a spell, ...")).toBeNull();
  });

  it("handles H:0(*) by extracting 0", () => {
    expect(parseStats("H:0(*) A:1 HP:15 L:1 Immobile. ...")).toMatchObject({
      hand_damage: 0, attack_rate: 1, hp_max: 15, level: 1,
    });
  });

  it("handles HP:7(x4) by extracting 7 (per-member HP)", () => {
    expect(parseStats("H:2 A:1 HP:7(x4) L:2 ...")).toMatchObject({ hp_max: 7 });
  });
});
