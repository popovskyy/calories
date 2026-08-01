/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * До цілі — росте. Легкий перебір (до +100) лишає повне полум'я;
 * від +100 — попередження й поступове загасання; від +300 — тухне.
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Починає загасати й показує попередження. */
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

  if (overBy >= HERO_HEAT_WARN_OVER_KCAL) {
    const span = HERO_HEAT_OUT_OVER_KCAL - HERO_HEAT_WARN_OVER_KCAL;
    const t = clamp((overBy - HERO_HEAT_WARN_OVER_KCAL) / span, 0, 1);
    // +100 → ~0.92, +300 → ~0.08 (ще жевріє перед «out»)
    // Scale з origin знизу дає відчуття «сповзання» полум'я.
    return {
      overBy,
      progress: 1,
      phase: "warning",
      intensity: 0.92 - t * 0.84,
      warn: true,
      extinguished: false,
    };
  }

  // Недобір / рівно ціль / легкий перебір (< +100) — горить на повну силу прогресу
  const phase: HeroHeatPhase = progress >= 0.97 || overBy > 0 ? "full" : "rising";
  const intensity =
    overBy > 0 ? 1 : 0.14 + progress * 0.86;

  return {
    overBy,
    progress: overBy > 0 ? 1 : progress,
    phase,
    intensity,
    warn: false,
    extinguished: false,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
