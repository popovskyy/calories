/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * Розмір: small → medium → large → mega (в нормі).
 * Будь-який перебір одразу показує попередження; полум'я лишається живим
 * (flicker), лише зменшується. Від +300 — повністю тухне.
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Текст «обережно…» — з першої зайвої ккал. */
export const HERO_HEAT_WARN_OVER_KCAL = 1;

/** Перебір: large → medium. */
export const HERO_HEAT_DIM_MED_OVER_KCAL = 100;

/** Перебір: medium → small. */
export const HERO_HEAT_DIM_SMALL_OVER_KCAL = 200;

/** Повністю тухне (як Peppa). */
export const HERO_HEAT_OUT_OVER_KCAL = OVER_PUNISH_KCAL;

/** @deprecated alias — сідання починається з medium-порогу. */
export const HERO_HEAT_DIM_OVER_KCAL = HERO_HEAT_DIM_MED_OVER_KCAL;

export type HeroHeatSize = "small" | "medium" | "large" | "mega" | "out";

export type HeroHeatPhase = "rising" | "full" | "warning" | "out";

const SIZE_INTENSITY: Record<Exclude<HeroHeatSize, "out">, number> = {
  mega: 1,
  large: 0.82,
  medium: 0.55,
  small: 0.32,
};

/** Scale множник для Campfire (origin знизу). */
export const HERO_HEAT_SIZE_SCALE: Record<Exclude<HeroHeatSize, "out">, number> = {
  mega: 1.35,
  large: 1.12,
  medium: 0.78,
  small: 0.52,
};

export interface HeroHeat {
  /** consumed − target (від’ємне = ще є запас). */
  overBy: number;
  /** 0..1 прогрес до цілі (без урахування перебору). */
  progress: number;
  phase: HeroHeatPhase;
  /** Явний розмір полум'я / лампи. */
  size: HeroHeatSize;
  /** 0..1 сила від size (для лампи / opacity). */
  intensity: number;
  /** Показати «обережно…». */
  warn: boolean;
  /** Після +100 — полум'я вже сідає з large. */
  dying: boolean;
  /** Вогонь/лампа погасли. */
  extinguished: boolean;
}

function sizeFromProgress(progress: number): Exclude<HeroHeatSize, "out" | "mega"> | "mega" {
  if (progress >= 0.97) return "mega";
  if (progress >= 0.85) return "large";
  if (progress >= 0.45) return "medium";
  return "small";
}

function sizeFromOverage(overBy: number): Exclude<HeroHeatSize, "out" | "mega"> {
  if (overBy >= HERO_HEAT_DIM_SMALL_OVER_KCAL) return "small";
  if (overBy >= HERO_HEAT_DIM_MED_OVER_KCAL) return "medium";
  return "large";
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
      size: "out",
      intensity: 0,
      warn: false,
      dying: false,
      extinguished: true,
    };
  }

  if (overBy >= HERO_HEAT_WARN_OVER_KCAL) {
    const size = sizeFromOverage(overBy);
    return {
      overBy,
      progress: 1,
      phase: "warning",
      size,
      intensity: SIZE_INTENSITY[size],
      warn: true,
      dying: overBy >= HERO_HEAT_DIM_MED_OVER_KCAL,
      extinguished: false,
    };
  }

  const size = sizeFromProgress(progress);
  const phase: HeroHeatPhase = size === "mega" ? "full" : "rising";
  return {
    overBy,
    progress,
    phase,
    size,
    intensity: SIZE_INTENSITY[size],
    warn: false,
    dying: false,
    extinguished: false,
  };
}
