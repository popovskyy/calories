/** Розрахунок денної норми: Mifflin–St Jeor BMR × побутовий рух (± дефіцит). */

export type Sex = "male" | "female";
/** @deprecated Залишено для сумісності БД; у формулі більше не використовується. */
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "maintain" | "deficit";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Побутовий рух (не тренування) — база підтримки ваги. */
export const MAINTENANCE_ACTIVITY_FACTOR = 1.2;
/** Дефіцит за замовчуванням, якщо ціль/тижні не задані: −15% від TDEE. */
export const DEFICIT_FACTOR = 0.85;
/** Орієнтовно ккал на 1 кг маси тіла. */
export const KCAL_PER_KG = 7700;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Майже без руху",
  light: "Легка (1–3×/тиж)",
  moderate: "Помірна (3–5×/тиж)",
  active: "Висока (6–7×/тиж)",
  very_active: "Дуже висока / важка праця",
};

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: "Підтримка ваги",
  deficit: "Дефіцит",
};

export const MONTH_LABELS_UK = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
] as const;

export interface CalorieInput {
  birthYear: number;
  birthMonth: number; // 1–12
  sex: Sex;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  /** Ігнорується — залишено для старих викликів. */
  activityLevel?: ActivityLevel;
  /** Цільова вага (кг). Разом із targetWeeks задає темп дефіциту. */
  targetWeightKg?: number | null;
  /** Строк до цілі у тижнях. */
  targetWeeks?: number | null;
  now?: Date;
}

export interface CalorieBreakdown {
  age: number;
  bmr: number;
  /** BMR × MAINTENANCE_ACTIVITY_FACTOR (побутовий рух). */
  tdee: number;
  targetCalories: number;
  /**
   * Як пораховано дефіцит: `pace` — від цілі/тижнів,
   * `fixed` — fallback −15%, `null` — підтримка.
   */
  deficitSource: "pace" | "fixed" | null;
  /** Фактичний відсоток зрізу від TDEE (після підлоги), для UI. */
  deficitPct: number | null;
  /**
   * true — норма піднята підлогою безпеки, тож темп із цілі/тижнів
   * лише з їжі може не встигнути (потрібні тренування або довший строк).
   */
  paceClamped: boolean;
}

export function ageFromBirth(
  birthYear: number,
  birthMonth: number,
  now: Date = new Date(),
): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  let age = y - birthYear;
  if (m < birthMonth) age -= 1;
  return Math.max(0, age);
}

/** Mifflin–St Jeor BMR (ккал/день). */
export function calcBmr(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

/** TDEE = BMR × побутовий рух. Тренування додаються окремими ActivityLog. */
export function calcTdee(bmr: number, _activityLevel?: ActivityLevel): number {
  return Math.round(bmr * MAINTENANCE_ACTIVITY_FACTOR);
}

export function deficitFloor(sex: Sex): number {
  return sex === "female" ? 1200 : 1500;
}

/**
 * Денний дефіцит (ккал), потрібний щоб скинути `lossKg` за `weeks` тижнів.
 * `null`, якщо темп задати неможливо.
 */
export function paceDailyDeficit(
  lossKg: number,
  weeks: number,
): number | null {
  if (!(lossKg > 0) || !(weeks >= 1)) return null;
  return (lossKg * KCAL_PER_KG) / (weeks * 7);
}

/**
 * Ціль = TDEE (підтримка) або TDEE − дефіцит.
 * Якщо є цільова вага < поточної і строк у тижнях — дефіцит від темпу
 * (Δкг × 7700 / днів). Інакше при goal=deficit — фіксований −15%.
 * Підлога: 1500♂ / 1200♀. Тренування — окремі ActivityLog.
 */
export function calcTargetCalories(input: CalorieInput): CalorieBreakdown {
  const age = ageFromBirth(input.birthYear, input.birthMonth, input.now);
  const bmr = Math.round(
    calcBmr({
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      age,
      sex: input.sex,
    }),
  );
  const tdee = calcTdee(bmr);

  if (input.goal === "maintain") {
    return {
      age,
      bmr,
      tdee,
      targetCalories: tdee,
      deficitSource: null,
      deficitPct: null,
      paceClamped: false,
    };
  }

  const tw = input.targetWeightKg;
  const weeks = input.targetWeeks;
  const lossKg =
    tw != null && Number.isFinite(tw) ? input.weightKg - tw : NaN;
  const paced =
    weeks != null && Number.isFinite(weeks)
      ? paceDailyDeficit(lossKg, weeks)
      : null;

  let rawTarget: number;
  let deficitSource: "pace" | "fixed";

  if (paced != null) {
    rawTarget = Math.round(tdee - paced);
    deficitSource = "pace";
  } else {
    rawTarget = Math.round(tdee * DEFICIT_FACTOR);
    deficitSource = "fixed";
  }

  const floor = deficitFloor(input.sex);
  const target = Math.max(rawTarget, floor);
  const deficitPct =
    tdee > 0 ? Math.round((1 - target / tdee) * 100) : null;

  return {
    age,
    bmr,
    tdee,
    targetCalories: target,
    deficitSource,
    deficitPct,
    paceClamped: deficitSource === "pace" && rawTarget < floor,
  };
}

/** База підтримки ваги (BMR × 1.2) — для прогнозу й норм БЖВ. */
export function calcMaintenanceCalories(input: {
  birthYear: number;
  birthMonth: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  now?: Date;
}): number {
  const age = ageFromBirth(input.birthYear, input.birthMonth, input.now);
  const bmr = calcBmr({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    sex: input.sex,
  });
  return calcTdee(bmr);
}

/** Норми макросів від ваги: білки 1.8 г/кг, жири 0.9 г/кг, вуглеводи — решта. */
export function calcMacroTargets(targetCalories: number, weightKg: number) {
  const protein = Math.round(1.8 * weightKg);
  const fats = Math.round(0.9 * weightKg);
  const carbs = Math.max(
    0,
    Math.round((targetCalories - protein * 4 - fats * 9) / 4),
  );
  return { protein, fats, carbs };
}

export function isActivityLevel(v: string): v is ActivityLevel {
  return v in ACTIVITY_MULTIPLIERS;
}

export function isSex(v: string): v is Sex {
  return v === "male" || v === "female";
}

export function isGoal(v: string): v is Goal {
  return v === "maintain" || v === "deficit";
}
