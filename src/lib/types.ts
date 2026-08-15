/** Спільні типи між API та фронтендом */

import type { ActivityLevel, Goal, Sex } from "@/lib/calories";

export type DayStatus = "green" | "amber" | "red";

export interface UserDTO {
  id: string;
  username: string;
  name: string;
  targetCalories: number;
  birthYear: number;
  birthMonth: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
  weight: number;
  height: number;
  /** Похідний вік з року+місяця народження */
  age: number;
  /** preset:… або legacy data-URL */
  avatarUrl: string | null;
  /** Активна тема оформлення */
  theme: string;
  targetWeight: number | null;
  startWeight: number | null;
  startWeightDate: string | null;
  /** false — акаунт чекає підтвердження адміна */
  approved: boolean;
  /** true — адмін призупинив доступ (окремо від approved: це не черга, а санкція) */
  blocked: boolean;
  /** Причина блокування — показується юзеру дослівно */
  blockReason: string | null;
}

/**
 * Юзер у списку адмінки — DTO плюс те, що потрібно для рішення «блокувати чи
 * ні»: коли востаннє був запис їжі (null = не було жодного).
 */
export interface AdminUserDTO extends UserDTO {
  lastEntryDate: string | null;
}

export interface ForecastResponse {
  configured: boolean;
  startWeight: number | null;
  /** Дата, від якої рахується ціль (YYYY-MM-DD) — початок осі графіка. */
  startWeightDate: string | null;
  currentWeight: number | null;
  targetWeight: number | null;
  /**
   * Вага, яку «прогнозує» журнал калорій від старту (не майбутня вага).
   * Порівнюй із currentWeight: якщо expected > current при схудненні —
   * на вагах ти легший, ніж каже калорійний трек.
   */
  expectedWeight: number | null;
  deltaActual: number | null;
  /** Дата, коли за поточним темпом (з фактичних зважувань) буде ціль. */
  projectedDate: string | null;
  /** Днів до projectedDate. */
  daysLeft: number | null;
  loggedDays: number;
  totalDays: number;
  /**
   * Дні з їжею, відкинуті як недозаписані (з'їдено надто мало, щоб це була
   * правда). Не входять у loggedDays і не тягнуть expectedWeight вниз.
   */
  skippedDays: number;
  /**
   * - progressing: темп веде до цілі, є projectedDate;
   * - stalled: темп нульовий або в бік від цілі;
   * - stale: давно не було зважувань — темп рахувати нема на чому;
   * - unknown: замало зважувань для тренду.
   */
  paceStatus: "progressing" | "stalled" | "stale" | "unknown";
  /** Темп зважувань, кг/тиждень (<0 — схуднення). null — замало даних. */
  trendKgPerWeek: number | null;
  /** Дата останнього зважування (YYYY-MM-DD). */
  lastWeighInDate: string | null;
  /** Скільки зважувань потрапило в оцінку темпу. */
  weighInCount: number;
  /**
   * Днів між першим і останнім зважуванням у вікні тренду.
   * Потрібен UI, щоб відрізнити «мало зважувань» від «замало часу між ними»:
   * 5 зважувань за 4 дні — це друге, і казати про перше було б неправдою.
   */
  trendSpanDays: number;
  /** Підтримка (TDEE) ккал/день. */
  maintenanceKcal: number | null;
  /** Денна ціль ккал. */
  targetKcal: number | null;
  /** Середній net (їжа − активність) за дні з записами. */
  avgNetKcal: number | null;
  /**
   * Сума (net − target) за дні з їжею.
   * >0 профіцит над ціллю, <0 дефіцит відносно цілі.
   */
  balanceVsTargetKcal: number | null;
  /**
   * Сума (net − maintenance). >0 профіцит над підтримкою (набір).
   */
  balanceVsMaintenanceKcal: number | null;
  /** Скільки днів net був вище денної цілі. */
  daysOverTarget: number;
  /** Скільки днів net був вище підтримки. */
  daysOverMaintenance: number;
  /**
   * Середній % net vs підтримка (від’ємне = дефіцит).
   * Для UI; вердикт темпу дивись calorieStance + balanceVsTargetKcal.
   */
  avgDeficitPct: number | null;
  /** Плановий % дефіциту: (maintenance − target) / maintenance. */
  plannedDeficitPct: number | null;
  /**
   * Темп журналу відносно плану калорій (за сумою періоду):
   * on_plan | shallow | deep | maintenance | surplus | unknown
   */
  calorieStance:
    | "on_plan"
    | "shallow"
    | "deep"
    | "maintenance"
    | "surplus"
    | "unknown";
}

export interface StreakResponse {
  streak: number;
  todayLogged: boolean;
}

export interface RecentActivityDTO {
  id: string;
  description: string;
  caloriesBurned: number;
  durationMin: number | null;
  createdAt: string;
}

export interface RecentMealDTO {
  id: string;
  description: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  createdAt: string;
}

export interface MealDTO {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  description: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  // Опційне: GET /api/meals (список) свідомо не селектить це поле — у старих
  // записах там data:-URI по сотні КБ база64. Присутнє лише у відповідях
  // POST/PATCH одразу після збереження запису.
  imageUrl?: string | null;
  status: "approved" | "cancelled" | string;
  createdAt: string; // ISO
}

export interface ActivityDTO {
  id: string;
  userId: string;
  date: string;
  description: string;
  caloriesBurned: number;
  durationMin: number | null;
  status: "approved" | "cancelled" | string;
  createdAt: string;
}

export interface AnalyzeActivityResult {
  caloriesBurned: number;
  durationMin: number | null;
  notes: string[];
}

/** Результат ШІ-аналізу страви */
export interface AnalyzeResult {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  parsedItems: string[];
}

export interface DashboardDay {
  date: string; // YYYY-MM-DD
  /** net = спожито − спалено */
  totalCalories: number;
  consumedCalories?: number;
  burnedCalories?: number;
  targetCalories: number;
  protein: number;
  fats: number;
  carbs: number;
  status: DayStatus;
  difference: number; // target - total
}

export interface DashboardResponse {
  userId: string;
  days: DashboardDay[]; // 7 днів, від найстарішого до сьогодні
  today: DashboardDay;
}
