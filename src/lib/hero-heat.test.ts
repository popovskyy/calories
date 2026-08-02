import { describe, expect, it } from "vitest";
import { OVER_PUNISH_KCAL } from "@/lib/economy";
import {
  HERO_HEAT_DIM_MED_OVER_KCAL,
  HERO_HEAT_DIM_SMALL_OVER_KCAL,
  HERO_HEAT_OVER_DYING_SCALE,
  HERO_HEAT_OVER_EMBER_SCALE,
  HERO_HEAT_SIZE_SCALE,
  heroHeatFromCalories,
} from "@/lib/hero-heat";

const TARGET = 2000;

describe("heroHeatFromCalories", () => {
  it("порожній день — маленький вогонь, без попереджень", () => {
    const h = heroHeatFromCalories(0, TARGET);
    expect(h.size).toBe("small");
    expect(h.phase).toBe("rising");
    expect(h.warn).toBe(false);
    expect(h.extinguished).toBe(false);
  });

  it("росте small → medium → large → mega", () => {
    expect(heroHeatFromCalories(TARGET * 0.3, TARGET).size).toBe("small");
    expect(heroHeatFromCalories(TARGET * 0.5, TARGET).size).toBe("medium");
    expect(heroHeatFromCalories(TARGET * 0.9, TARGET).size).toBe("large");
    expect(heroHeatFromCalories(TARGET, TARGET).size).toBe("mega");
  });

  it("рівно в ціль — повний жар без попередження", () => {
    const h = heroHeatFromCalories(TARGET, TARGET);
    expect(h.phase).toBe("full");
    expect(h.warn).toBe(false);
    expect(h.fireScale).toBe(HERO_HEAT_SIZE_SCALE.mega);
  });

  it("перша ж зайва ккал сідає до половини mega і вмикає warn", () => {
    const h = heroHeatFromCalories(TARGET + 1, TARGET);
    expect(h.warn).toBe(true);
    expect(h.dying).toBe(false);
    expect(h.extinguished).toBe(false);
    expect(h.fireScale).toBe(HERO_HEAT_SIZE_SCALE.small);
    expect(h.fireScale).toBeCloseTo(HERO_HEAT_SIZE_SCALE.mega / 2, 1);
  });

  it("після +100 і +200 сідає ще, але не гасне", () => {
    const med = heroHeatFromCalories(TARGET + HERO_HEAT_DIM_MED_OVER_KCAL, TARGET);
    const ember = heroHeatFromCalories(TARGET + HERO_HEAT_DIM_SMALL_OVER_KCAL, TARGET);
    expect(med.fireScale).toBe(HERO_HEAT_OVER_DYING_SCALE);
    expect(ember.fireScale).toBe(HERO_HEAT_OVER_EMBER_SCALE);
    expect(med.dying).toBe(true);
    expect(ember.dying).toBe(true);
    expect(med.extinguished).toBe(false);
    expect(ember.extinguished).toBe(false);
  });

  it("масштаб монотонно спадає з ростом перебору", () => {
    const overs = [1, 50, 100, 199, 200, 299];
    const scales = overs.map((o) => heroHeatFromCalories(TARGET + o, TARGET).fireScale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]!).toBeLessThanOrEqual(scales[i - 1]!);
    }
  });

  it("гасне рівно на OVER_PUNISH_KCAL", () => {
    const alive = heroHeatFromCalories(TARGET + OVER_PUNISH_KCAL - 1, TARGET);
    const out = heroHeatFromCalories(TARGET + OVER_PUNISH_KCAL, TARGET);
    expect(alive.extinguished).toBe(false);
    expect(out.extinguished).toBe(true);
    expect(out.phase).toBe("out");
    expect(out.fireScale).toBe(0);
    // warn знімається: згаслий вогонь — це вже не «обережно», а факт.
    expect(out.warn).toBe(false);
  });

  it("не ділить на нуль при нульовій цілі", () => {
    const h = heroHeatFromCalories(0, 0);
    expect(Number.isFinite(h.progress)).toBe(true);
    expect(Number.isFinite(h.fireScale)).toBe(true);
  });
});
