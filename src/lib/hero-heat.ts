/**
 * Візуальна «сила» вогню / лампи від денних калорій (net на герої).
 *
 * До цілі: small → medium → large → mega (в нормі).
 * Будь-який перебір: одразу половиний розмір (від mega), живий flicker,
 * повідомлення. Ближче до +300 ще сідає. ≥ +300 — тухне.
 */

import { OVER_PUNISH_KCAL } from "@/lib/economy";

/** Текст «обережно…» — з першої зайвої ккал. */
export const HERO_HEAT_WARN_OVER_KCAL = 1;

/** Перебір: half → ще менший. */
export const HERO_HEAT_DIM_MED_OVER_KCAL = 100;

/** Перебір: ще менший → майже вугілля. */
export const HERO_HEAT_DIM_SMALL_OVER_KCAL = 200;

/** Повністю тухне (як Peppa). */
export const HERO_HEAT_OUT_OVER_KCAL = OVER_PUNISH_KCAL;

/** @deprecated alias */
export const HERO_HEAT_DIM_OVER_KCAL = HERO_HEAT_DIM_MED_OVER_KCAL;

export type HeroHeatSize = "small" | "medium" | "large" | "mega" | "out";

export type HeroHeatPhase = "rising" | "full" | "warning" | "out";

/**
 * Scale: mega = повний жар у нормі.
 * При переборі стартуємо з half (= mega/2), далі ще сідаємо.
 */
export const HERO_HEAT_SIZE_SCALE: Record<Exclude<HeroHeatSize, "out">, number> = {
  mega: 1.28,
  large: 1.08,
  medium: 0.86,
  /** Половина mega — будь-який легкий перебір (+30 тощо). */
  small: 0.64,
};

const SIZE_INTENSITY: Record<Exclude<HeroHeatSize, "out">, number> = {
  mega: 1,
  large: 0.82,
  medium: 0.55,
  small: 0.42,
};

/** Ще менший scale між +100 і +299 (менше за half). */
export const HERO_HEAT_OVER_DYING_SCALE = 0.48;
export const HERO_HEAT_OVER_EMBER_SCALE = 0.36;

export interface HeroHeat {
  overBy: number;
  progress: number;
  phase: HeroHeatPhase;
  size: HeroHeatSize;
  /** Готовий scale для Campfire (вже з half/dying/ember). */
  fireScale: number;
  intensity: number;
  warn: boolean;
  dying: boolean;
  extinguished: boolean;
}

function sizeFromProgress(progress: number): Exclude<HeroHeatSize, "out"> {
  if (progress >= 0.97) return "mega";
  if (progress >= 0.85) return "large";
  if (progress >= 0.45) return "medium";
  return "small";
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
      fireScale: 0,
      intensity: 0,
      warn: false,
      dying: false,
      extinguished: true,
    };
  }

  // Будь-який перебір: половина mega + warn; далі ще сідає, але завжди «small» tier
  if (overBy >= HERO_HEAT_WARN_OVER_KCAL) {
    let fireScale = HERO_HEAT_SIZE_SCALE.small; // half mega
    let intensity = SIZE_INTENSITY.small;
    let dying = false;
    if (overBy >= HERO_HEAT_DIM_SMALL_OVER_KCAL) {
      fireScale = HERO_HEAT_OVER_EMBER_SCALE;
      intensity = 0.28;
      dying = true;
    } else if (overBy >= HERO_HEAT_DIM_MED_OVER_KCAL) {
      fireScale = HERO_HEAT_OVER_DYING_SCALE;
      intensity = 0.35;
      dying = true;
    }
    return {
      overBy,
      progress: 1,
      phase: "warning",
      size: "small",
      fireScale,
      intensity,
      warn: true,
      dying,
      extinguished: false,
    };
  }

  const size = sizeFromProgress(progress);
  return {
    overBy,
    progress,
    phase: size === "mega" ? "full" : "rising",
    size,
    fireScale: HERO_HEAT_SIZE_SCALE[size],
    intensity: SIZE_INTENSITY[size],
    warn: false,
    dying: false,
    extinguished: false,
  };
}
