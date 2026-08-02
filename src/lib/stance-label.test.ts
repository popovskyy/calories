import { describe, expect, it } from "vitest";
import {
  type CalorieStance,
  stanceLabelUk,
  stanceShortUk,
} from "@/lib/calories";

const STANCES: CalorieStance[] = [
  "on_plan",
  "shallow",
  "maintenance",
  "surplus",
  "deep",
];

describe("stanceShortUk (UI) vs stanceLabelUk (промпт)", () => {
  it("для кожного темпу й цілі повертає непорожній рядок", () => {
    for (const goal of ["deficit", "maintain"] as const) {
      for (const s of STANCES) {
        expect(stanceShortUk(s, goal), `${goal}/${s}`).toBeTruthy();
        expect(stanceLabelUk(s, goal), `${goal}/${s}`).toBeTruthy();
      }
    }
  });

  it("UI-ярлик не тягне службову нотацію зі слешем і дужками", () => {
    // Дужка «(є, але слабший за план / були перебори)» написана для моделі,
    // щоб та не сплутала м'який дефіцит зі зривом. На картці це виглядало
    // як внутрішня нотація — саме тому UI має власну коротку форму.
    for (const goal of ["deficit", "maintain"] as const) {
      for (const s of STANCES) {
        const ui = stanceShortUk(s, goal);
        expect(ui, `${goal}/${s}`).not.toContain("/");
        expect(ui, `${goal}/${s}`).not.toContain("(");
      }
    }
  });

  it("промптовий ярлик навмисно лишає розгорнуте пояснення для shallow", () => {
    expect(stanceLabelUk("shallow", "deficit")).toContain("(");
  });

  it("UI-ярлик коротший за промптовий там, де є що скорочувати", () => {
    expect(stanceShortUk("shallow", "deficit").length).toBeLessThan(
      stanceLabelUk("shallow", "deficit").length,
    );
  });

  it("на цілі «підтримка» жоден темп не називається дефіцитом у плані", () => {
    for (const s of STANCES) {
      expect(stanceShortUk(s, "maintain")).not.toContain("у плані");
    }
  });
});

/**
 * Напрямок розбіжності «журнал обіцяє X · на вагах Y» на картці цілі.
 * Та сама логіка, що в CalorieTrackRow: знак розриву сам собою нічого не
 * означає, поки не звірити його з напрямком цілі.
 */
function aheadOfLedger(
  currentWeight: number,
  expectedWeight: number,
  goalDir: number,
): boolean {
  const gap = currentWeight - expectedWeight;
  return goalDir !== 0 && Math.sign(gap) === Math.sign(goalDir);
}

describe("напрямок розбіжності з калорійним треком", () => {
  it("схуднення: легший за обіцяне — випереджаємо", () => {
    expect(aheadOfLedger(93.6, 93.8, -1)).toBe(true);
  });

  it("схуднення: важчий за обіцяне — відстаємо", () => {
    expect(aheadOfLedger(94.2, 93.8, -1)).toBe(false);
  });

  /**
   * Регресія: раніше умова була просто `gap > 0 ? відстаємо : випереджаємо`,
   * тобто «мінус на вагах = добре» було зашито намертво. На цілі НАБРАТИ вагу
   * це давало протилежне за змістом повідомлення.
   */
  it("набір ваги: легший за обіцяне — це відставання, а не випередження", () => {
    expect(aheadOfLedger(93.6, 93.8, +1)).toBe(false);
  });

  it("набір ваги: важчий за обіцяне — випереджаємо", () => {
    expect(aheadOfLedger(94.2, 93.8, +1)).toBe(true);
  });

  it("ціль тримати вагу: жоден бік не «випереджає»", () => {
    expect(aheadOfLedger(93.6, 93.8, 0)).toBe(false);
    expect(aheadOfLedger(94.2, 93.8, 0)).toBe(false);
  });
});
