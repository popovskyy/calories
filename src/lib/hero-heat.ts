/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * 0 → ледь жевріє; до цілі росте; від +100 — загасає з попередженням;
 * від +300 — тухне (як Peppa OVER_PUNISH_KCAL).
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Починає загасати й показує попередження. */
export const HERO_HEAT_WARN_OVER_KCAL = 100;

/** Повністю тухне. */
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

  let phase: HeroHeatPhase;
  if (overBy >= HERO_HEAT_OUT_OVER_KCAL) phase = "out";
  else if (overBy >= HERO_HEAT_WARN_OVER_KCAL) phase = "warning";
  else if (progress >= 0.97) phase = "full";
  else phase = "rising";

  let intensity: number;
  if (phase === "out") {
    intensity = 0;
  } else if (phase === "warning") {
    const span = HERO_HEAT_OUT_OVER_KCAL - HERO_HEAT_WARN_OVER_KCAL;
    const t = clamp((overBy - HERO_HEAT_WARN_OVER_KCAL) / span, 0, 1);
    // +100 → ~0.92, +300 → ~0.08 (ще жевріє перед «out»)
    intensity = 0.92 - t * 0.84;
  } else {
    // 0 ккал → ледь (0.14), ціль → 1
    intensity = 0.14 + progress * 0.86;
  }

  return {
    overBy,
    progress,
    phase,
    intensity,
    warn: phase === "warning",
    extinguished: phase === "out",
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
