import { describe, expect, it } from "vitest";
import { colorLabel, nextColorNumber } from "@/lib/color-number";

describe("nextColorNumber", () => {
  it("starts at 1 when the fabric has no colours", () => {
    expect(nextColorNumber([])).toBe("1");
  });

  it("increments past the highest numeric colour", () => {
    expect(nextColorNumber([{ displayOrder: "1" }, { displayOrder: "2" }])).toBe(
      "3",
    );
  });

  it("keeps incrementing after a gap instead of reusing a number", () => {
    expect(nextColorNumber([{ displayOrder: "1" }, { displayOrder: "3" }])).toBe(
      "4",
    );
  });

  it("falls back to the row count for legacy named colours", () => {
    expect(
      nextColorNumber([
        { displayOrder: "Maroon" },
        { displayOrder: "Ivory" },
      ]),
    ).toBe("3");
  });

  it("ignores blank labels when numbering", () => {
    expect(nextColorNumber([{ displayOrder: "" }])).toBe("2");
  });
});

describe("colorLabel", () => {
  it("prefixes numeric colour labels", () => {
    expect(colorLabel("3", 0)).toBe("Colour #3");
  });

  it("keeps legacy named colours as they are", () => {
    expect(colorLabel("Maroon", 0)).toBe("Maroon");
  });

  it("falls back to the row position when unlabelled", () => {
    expect(colorLabel("", 1)).toBe("Colour #2");
  });
});
