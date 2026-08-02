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
/** Дефіцит −15% від TDEE. */
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
  now?: Date;
}

export interface CalorieBreakdown {
  age: number;
  bmr: number;
  /** BMR × MAINTENANCE_ACTIVITY_FACTOR (побутовий рух). */
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

/** TDEE = BMR × побутовий рух. Тренування додаються окремими ActivityLog. */
export function calcTdee(bmr: number, _activityLevel?: ActivityLevel): number {
  return Math.round(bmr * MAINTENANCE_ACTIVITY_FACTOR);
}

export function deficitFloor(sex: Sex): number {
  return sex === "female" ? 1200 : 1500;
}

/**
 * Ціль = TDEE (підтримка) або TDEE×0.85 (дефіцит, з підлогою).
 * Тренування враховуються окремими ActivityLog, не множником.
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

  let target =
    input.goal === "maintain" ? tdee : Math.round(tdee * DEFICIT_FACTOR);

  if (input.goal === "deficit") {
    target = Math.max(target, deficitFloor(input.sex));
  }

  return {
    age,
    bmr,
    tdee,
    targetCalories: target,
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

/**
 * Градація факту відносно підтримки (TDEE) і денної цілі.
 * Приклад: план −15%, факт −10% → `shallow` (дефіцит є, але м'якший за план).
 */
export type CalorieStance =
  | "on_plan"
  | "shallow"
  | "maintenance"
  | "surplus"
  | "deep";

export function plannedDeficitPct(goal: Goal): number {
  return goal === "deficit" ? Math.round((1 - DEFICIT_FACTOR) * 100) : 0;
}

/** Фактичний % плану від поточної підтримки й денної цілі (не хардкод 15). */
export function plannedDeficitPctFromTargets(
  maintenance: number,
  target: number,
): number {
  if (maintenance <= 0) return 0;
  return Math.round(((maintenance - target) / maintenance) * 100);
}

/** % відхилення net від maintenance: −10 = дефіцит 10%, +5 = профіцит 5%. */
export function pctVsMaintenance(netKcal: number, maintenance: number): number {
  if (maintenance <= 0) return 0;
  return Math.round(((netKcal - maintenance) / maintenance) * 100);
}

/**
 * Класифікує середній net відносно maintenance і target.
 * `deep` — помітно глибше за план (нижче цілі на ≥8%); `on_plan` — біля/під ціллю.
 */
export function classifyCalorieStance(input: {
  netKcal: number;
  maintenance: number;
  target: number;
  goal: Goal;
}): CalorieStance {
  const { netKcal, maintenance, target, goal } = input;
  if (maintenance <= 0) return "maintenance";

  const vsMaint = pctVsMaintenance(netKcal, maintenance);
  const band = Math.max(40, Math.round(target * 0.05));

  if (goal === "maintain") {
    if (Math.abs(netKcal - target) <= band) return "on_plan";
    if (netKcal > target + band) return "surplus";
    return "deep";
  }

  // deficit: профіцит лише над підтримкою; між ціллю і TDEE — м'який дефіцит
  if (netKcal > maintenance * 1.03) return "surplus";
  if (Math.abs(vsMaint) <= 3) return "maintenance";
  if (netKcal > target + band && netKcal < maintenance * 0.97) return "shallow";
  if (netKcal < target - Math.round(target * 0.08)) return "deep";
  return "on_plan";
}

/**
 * Вердикт журналу за СУМОЮ за період (не лише середнім %), щоб дні з
 * перебором 2500+ при цілі ~2000 не маскувались «середнім −16%».
 */
export function classifyLedgerStance(input: {
  balanceVsTarget: number;
  balanceVsMaintenance: number;
  loggedDays: number;
  daysOverTarget: number;
  target: number;
  maintenance: number;
  goal: Goal;
}): CalorieStance {
  const {
    balanceVsTarget,
    balanceVsMaintenance,
    loggedDays,
    daysOverTarget,
    target,
    maintenance,
    goal,
  } = input;
  if (loggedDays <= 0 || maintenance <= 0) return "maintenance";

  const avgVsTarget = balanceVsTarget / loggedDays;
  const avgVsMaint = balanceVsMaintenance / loggedDays;
  const band = Math.max(40, Math.round(target * 0.05));
  // Багато днів над ціллю — навіть якщо хтось «відіграв» недоїданням
  const overTargetHeavy = daysOverTarget >= Math.ceil(loggedDays / 2);

  if (goal === "maintain") {
    if (Math.abs(avgVsTarget) <= band) return "on_plan";
    if (avgVsTarget > band) return "surplus";
    return "deep";
  }

  // Над підтримкою в сумі або в середньому — справжній профіцит.
  // Суму нормуємо на тиждень: інакше поріг «пів дня підтримки» за 60 днів
  // спрацьовував би від 17 ккал/день, тобто від шуму.
  const perWeekVsMaint = balanceVsMaintenance / Math.max(1, loggedDays / 7);
  if (avgVsMaint > maintenance * 0.03 || perWeekVsMaint > maintenance * 0.5) {
    return "surplus";
  }
  // Над денною ціллю в сумі / часто над ціллю, але ще під TDEE — м'який темп
  if (avgVsTarget > band || (overTargetHeavy && balanceVsTarget > 0)) {
    if (Math.abs(avgVsMaint) <= maintenance * 0.03) return "maintenance";
    return "shallow";
  }
  if (avgVsTarget < -Math.round(target * 0.08)) return "deep";
  return "on_plan";
}

/** Короткий український ярлик для промптів і UI. */
/**
 * Короткий ярлик для UI — без пояснювальної дужки.
 *
 * `stanceLabelUk` нижче пишеться для ПРОМПТА: там дужка «(є, але слабший за
 * план / були перебори)» потрібна, щоб модель не сплутала м'який дефіцит зі
 * зривом. На картці ж вона читається як службова нотація зі слешем, тож
 * інтерфейс отримує свою, коротшу форму.
 */
export function stanceShortUk(stance: CalorieStance, goal: Goal): string {
  if (goal === "maintain") {
    switch (stance) {
      case "on_plan":
        return "біля норми підтримки";
      case "surplus":
        return "профіцит над підтримкою";
      case "deep":
        return "помітний недобір";
      default:
        return "біля підтримки";
    }
  }
  switch (stance) {
    case "on_plan":
      return "дефіцит у плані";
    case "shallow":
      return "м'який дефіцит, слабший за план";
    case "deep":
      return "глибший дефіцит за план";
    case "maintenance":
      return "майже без дефіциту";
    case "surplus":
      return "профіцит над підтримкою";
  }
}

/** Розгорнутий ярлик для промптів ШІ — з підказкою, як трактувати темп. */
export function stanceLabelUk(stance: CalorieStance, goal: Goal): string {
  if (goal === "maintain") {
    switch (stance) {
      case "on_plan":
        return "біля норми підтримки";
      case "surplus":
        return "профіцит над підтримкою";
      case "deep":
        return "помітний недобір відносно підтримки";
      default:
        return "біля підтримки";
    }
  }
  switch (stance) {
    case "on_plan":
      return "дефіцит у плані відносно денної цілі";
    case "shallow":
      return "м'який дефіцит (є, але слабший за план / були перебори)";
    case "deep":
      return "глибший дефіцит за план";
    case "maintenance":
      return "близько до підтримки (майже без дефіциту)";
    case "surplus":
      return "профіцит над підтримкою";
  }
}
