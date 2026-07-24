/** Розрахунок денної норми калорій (Mifflin–St Jeor → TDEE → ціль). */

export type Sex = "male" | "female";
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
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Для тестів / детермінізму; за замовчуванням — зараз */
  now?: Date;
}

export interface CalorieBreakdown {
  age: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
}

/** Повні роки від року+місяця народження до `now`. */
export function ageFromBirth(
  birthYear: number,
  birthMonth: number,
  now: Date = new Date(),
): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1–12
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

export function calcTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/** Мін. безпечна норма при дефіциті. */
export function deficitFloor(sex: Sex): number {
  return sex === "female" ? 1200 : 1500;
}

export function calcTargetCalories(input: CalorieInput): CalorieBreakdown {
  const age = ageFromBirth(input.birthYear, input.birthMonth, input.now);
  const bmr = calcBmr({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    sex: input.sex,
  });
  const tdee = calcTdee(bmr, input.activityLevel);

  let target =
    input.goal === "maintain" ? Math.round(tdee) : Math.round(tdee * 0.85);

  if (input.goal === "deficit") {
    target = Math.max(target, deficitFloor(input.sex));
  }

  return {
    age,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
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
