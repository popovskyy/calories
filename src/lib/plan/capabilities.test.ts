import { describe, expect, it } from "vitest";
import { detectCapabilities, isDipExercise, isFullPullUp } from "./capabilities";

describe("detectCapabilities", () => {
  it("знаходить турнік і бруси в описі шведської стінки", () => {
    expect(detectCapabilities("Шведская стенка с пластиковыми перекладинам турнік брусья")).toEqual({ pullBar: true, dipBars: true });
  });
  it("голі «перекладини» драбини — це ще не турнік", () => {
    expect(detectCapabilities("Шведська стінка з пластиковими перекладинами")).toEqual({ pullBar: false, dipBars: false });
  });
  it("гантель і ролик нічого не додають", () => {
    expect(detectCapabilities("Гантеля Ролик для преса")).toEqual({ pullBar: false, dipBars: false });
  });
});

describe("isFullPullUp / isDipExercise", () => {
  it("відрізняє повні підтягування від австралійських", () => {
    expect(isFullPullUp("Підтягування широким хватом")).toBe(true);
    expect(isFullPullUp("Австралійські підтягування під низькою перекладиною")).toBe(false);
    expect(isFullPullUp("Горизонтальні підтягування")).toBe(false);
    expect(isFullPullUp("Присідання")).toBe(false);
  });
  it("впізнає віджимання на брусах, а не підйом ніг", () => {
    expect(isDipExercise("Віджимання на брусах")).toBe(true);
    expect(isDipExercise("Віджимання від брусів")).toBe(true);
    expect(isDipExercise("Віджимання від підлоги")).toBe(false);
  });
});
