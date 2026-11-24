import { describe, expect, it } from "vitest";
import { detectCapabilities, isDipExercise, isFullPullUp, routineMentionsCardio } from "./capabilities";

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

describe("routineMentionsCardio", () => {
  it("впізнає кардіо у звичках", () => {
    expect(routineMentionsCardio("щодня 45 хв велотренажер; підтягування")).toBe(true);
    expect(routineMentionsCardio("Вранці біг 5 км")).toBe(true);
    expect(routineMentionsCardio("двічі на тиждень плаваю")).toBe(true);
    expect(routineMentionsCardio("підтягування й віджимання на турніку")).toBe(false);
    expect(routineMentionsCardio("")).toBe(false);
  });
});
