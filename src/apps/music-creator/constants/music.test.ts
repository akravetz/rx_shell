import { describe, expect, it } from "vitest";
import { isBarEnd, STEPS, STEPS_PER_BAR } from "./music";

describe("isBarEnd", () => {
  it("marks every fourth step as a bar boundary", () => {
    expect(STEPS / STEPS_PER_BAR).toBe(4);
    expect(isBarEnd(3)).toBe(true);
    expect(isBarEnd(7)).toBe(true);
    expect(isBarEnd(11)).toBe(true);
    expect(isBarEnd(15)).toBe(true);
  });

  it("does not mark other steps", () => {
    expect(isBarEnd(0)).toBe(false);
    expect(isBarEnd(4)).toBe(false);
    expect(isBarEnd(14)).toBe(false);
  });
});
