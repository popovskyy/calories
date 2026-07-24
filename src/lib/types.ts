/** Спільні типи між API та фронтендом */

import type { ActivityLevel, Goal, Sex } from "@/lib/calories";

export type DayStatus = "green" | "red";

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
  /** data-URL мультяшного аватара (Gemini) */
  avatarUrl: string | null;
}

export interface ArenaEntry {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  goal: Goal;
  goalLabel: string;
  targetCalories: number;
  todayCalories: number;
  /** target - today (>0 = залишок/дефіцит, <0 = перебір) */
  difference: number;
  hasLog: boolean;
  isMe: boolean;
}

export interface ArenaResponse {
  date: string;
  entries: ArenaEntry[];
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
  imageUrl: string | null;
  createdAt: string; // ISO
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
  totalCalories: number;
  targetCalories: number;
  protein: number;
  fats: number;
  carbs: number;
  status: DayStatus;
  difference: number; // target - total (додатнє = залишок, від'ємне = перебір)
}

export interface DashboardResponse {
  userId: string;
  days: DashboardDay[]; // 7 днів, від найстарішого до сьогодні
  today: DashboardDay;
}
