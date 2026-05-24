import { describe, it, expect } from "vitest";
import { parseTargetFromRulesText } from "../src/enrich/parseTarget.js";

describe("parseTargetFromRulesText", () => {
  it("extracts simple targets", () => {
    expect(parseTargetFromRulesText("Cast on globe. ...")).toBe("globe");
    expect(parseTargetFromRulesText("Cast on group. ...")).toBe("group");
    expect(parseTargetFromRulesText("Cast on recruit. ...")).toBe("recruit");
    expect(parseTargetFromRulesText("Cast on square. ...")).toBe("square");
  });

  it("extracts compound targets without losing precision", () => {
    expect(parseTargetFromRulesText("Cast on friendly recruit group. ...")).toBe("friendly recruit group");
    expect(parseTargetFromRulesText("Cast on town or colony. ...")).toBe("town or colony");
    expect(parseTargetFromRulesText("Cast on friendly minion. ...")).toBe("friendly minion");
  });

  it("skips past a leading stat block for creatures", () => {
    expect(parseTargetFromRulesText("H:3 A:1 HP:10 L:2 Cast on globe. ...")).toBe("globe");
    expect(parseTargetFromRulesText("M:2 A:0 HP:7 L:1 Cast on globe. ...")).toBe("globe");
  });

  it("returns null if 'Cast on ...' isn't present", () => {
    expect(parseTargetFromRulesText("H:2 A:1 HP:7 L:1 Nomadic. ...")).toBeNull();
    expect(parseTargetFromRulesText("When any player casts a spell, ...")).toBeNull();
  });
});
