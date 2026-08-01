/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * До цілі — росте. Будь-який перебір одразу показує попередження, але
 * полум'я лишається повним. Від +100 починає сідати; від +300 — тухне.
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Текст «обережно…» — з першої зайвої ккал. */
export const HERO_HEAT_WARN_OVER_KCAL = 1;

/** Полум'я починає реально сідати (scale/intensity). */
export const HERO_HEAT_DIM_OVER_KCAL = 100;

/** Повністю тухне (як Peppa). */
export const HERO_HEAT_OUT_OVER_KCAL = OVER_PUNISH_KCAL;

export type HeroHeatPhase = "rising" | "full" | "warning" | "out";

export interface HeroHeat {
  /** consumed − target (від’ємне = ще є запас). */
  overBy: number;
  /** 0..1 прогрес до цілі (без урахування перебору). */
  progress: number;
  phase: HeroHeatPhase;
  /** 0..1 сила полум'я / лампи. */
  intensity: number;
  /** Показати «обережно…». */
  warn: boolean;
  /** Intensity вже падає (після DIM). */
  dying: boolean;
  /** Вогонь/лампа погасли. */
  extinguished: boolean;
}

export function heroHeatFromCalories(consumed: number, target: number): HeroHeat {
  const safeTarget = target > 0 ? target : 1;
  const overBy = consumed - safeTarget;
  const progress = Math.min(1, Math.max(0, consumed / safeTarget));

  if (overBy >= HERO_HEAT_OUT_OVER_KCAL) {
    return {
      overBy,
      progress: 1,
      phase: "out",
      intensity: 0,
      warn: false,
      dying: false,
      extinguished: true,
    };
  }

  // Перебір, але ще до порогу «сідання» — повне живе полум'я + повідомлення
  if (overBy >= HERO_HEAT_WARN_OVER_KCAL && overBy < HERO_HEAT_DIM_OVER_KCAL) {
    return {
      overBy,
      progress: 1,
      phase: "warning",
      intensity: 1,
      warn: true,
      dying: false,
      extinguished: false,
    };
  }

  if (overBy >= HERO_HEAT_DIM_OVER_KCAL) {
    const span = HERO_HEAT_OUT_OVER_KCAL - HERO_HEAT_DIM_OVER_KCAL;
    const t = clamp((overBy - HERO_HEAT_DIM_OVER_KCAL) / span, 0, 1);
    // +100 → ~0.92, +300 → ~0.08 (ще жевріє перед «out»)
    return {
      overBy,
      progress: 1,
      phase: "warning",
      intensity: 0.92 - t * 0.84,
      warn: true,
      dying: true,
      extinguished: false,
    };
  }

  const phase: HeroHeatPhase = progress >= 0.97 ? "full" : "rising";
  return {
    overBy,
    progress,
    phase,
    intensity: 0.14 + progress * 0.86,
    warn: false,
    dying: false,
    extinguished: false,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
