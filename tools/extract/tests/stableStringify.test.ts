import { describe, it, expect } from "vitest";
import { stableStringify } from "../src/util/stableStringify.js";

describe("stableStringify", () => {
  it("sorts object keys alphabetically", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys recursively in nested objects", () => {
    expect(stableStringify({ b: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}'
    );
  });

  it("preserves array order", () => {
    expect(stableStringify({ list: [3, 1, 2] })).toBe('{"list":[3,1,2]}');
  });

  it("formats with given indent when requested", () => {
    expect(stableStringify({ b: 1, a: 2 }, 2)).toBe(
      '{\n  "a": 2,\n  "b": 1\n}'
    );
  });

  it("handles null and primitives", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("hi")).toBe('"hi"');
  });
});
