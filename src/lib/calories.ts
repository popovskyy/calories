/** Розрахунок денної норми: Mifflin–St Jeor BMR (вік, кг, см, стать) — без множника «скільки разів на тиждень». */

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
  now?: Date;
}

export interface CalorieBreakdown {
  age: number;
  bmr: number;
  /** = BMR (активність додається окремими записами в журналі). */
  tdee: number;
  targetCalories: number;
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

/** @deprecated Множник активності більше не входить у денну норму. */
export function calcTdee(bmr: number, _activityLevel?: ActivityLevel): number {
  return bmr;
}

export function deficitFloor(sex: Sex): number {
  return sex === "female" ? 1200 : 1500;
}

/**
 * Ціль = BMR (підтримка) або BMR×0.85 (дефіцит, з підлогою).
 * Тренування враховуються окремими ActivityLog, не множником.
 */
export function calcTargetCalories(input: CalorieInput): CalorieBreakdown {
  const age = ageFromBirth(input.birthYear, input.birthMonth, input.now);
  const bmr = calcBmr({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    sex: input.sex,
  });
  const base = Math.round(bmr);

  let target =
    input.goal === "maintain" ? base : Math.round(base * 0.85);

  if (input.goal === "deficit") {
    target = Math.max(target, deficitFloor(input.sex));
  }

  return {
    age,
    bmr: base,
    tdee: base,
    targetCalories: target,
  };
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
