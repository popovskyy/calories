/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * До цілі — росте. Будь-який перебір одразу гасить силу;
 * від +100 — попередження; від +300 — повністю тухне.
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Текст «обережно…». */
export const HERO_HEAT_WARN_OVER_KCAL = 100;

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
  /** Вогонь/лампа погасли. */
  extinguished: boolean;
}

export function heroHeatFromCalories(consumed: number, target: number): HeroHeat {
  const safeTarget = target > 0 ? target : 1;
  const overBy = consumed - safeTarget;
  const progress = Math.min(1, Math.max(0, consumed / safeTarget));

  // Перебір: лінійно гасне від першої зайвої ккал → 0 на +300
  if (overBy >= HERO_HEAT_OUT_OVER_KCAL) {
    return {
      overBy,
      progress: 1,
      phase: "out",
      intensity: 0,
      warn: false,
      extinguished: true,
    };
  }

  if (overBy > 0) {
    const t = overBy / HERO_HEAT_OUT_OVER_KCAL; // 0..1
    const intensity = Math.max(0.04, 1 - t);
    const warn = overBy >= HERO_HEAT_WARN_OVER_KCAL;
    return {
      overBy,
      progress: 1,
      phase: warn ? "warning" : "full",
      intensity,
      warn,
      extinguished: false,
    };
  }

  // Недобір / рівно ціль
  const phase: HeroHeatPhase = progress >= 0.97 ? "full" : "rising";
  const intensity = 0.14 + progress * 0.86;

  return {
    overBy,
    progress,
    phase,
    intensity,
    warn: false,
    extinguished: false,
  };
}
