/** Спільні типи між API та фронтендом */

export type DayStatus = "green" | "red";

export interface UserDTO {
  id: string;
  name: string;
  targetCalories: number;
  age: number;
  weight: number;
  height: number;
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
