import { describe, expect, it } from "vitest";
import { toOptionalNumber, toText } from "./values";

describe("toOptionalNumber", () => {
  it("reads numbers and leaves empty or invalid input undefined", () => {
    expect(toOptionalNumber(3)).toBe(3);
    expect(toOptionalNumber("4")).toBe(4);
    expect(toOptionalNumber(0)).toBe(0);
    expect(toOptionalNumber(null)).toBeUndefined();
    expect(toOptionalNumber("")).toBeUndefined();
    expect(toOptionalNumber("x")).toBeUndefined();
  });
});

describe("toText", () => {
  it("turns any input value into a string", () => {
    expect(toText("a")).toBe("a");
    expect(toText(null)).toBe("");
    expect(toText(5)).toBe("5");
  });
});
