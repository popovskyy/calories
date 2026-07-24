/** Спільні типи між API та фронтендом */

import type { ActivityLevel, Goal, Sex } from "@/lib/calories";
import type { Rarity, SkinTier } from "@/lib/avatar-presets";

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
  /** Внутрішня валюта за звички */
  coins: number;
  /** Куплені преміум skinId */
  ownedSkinIds: string[];
}

/** Нарахована нагорода (для тостів) */
export interface GrantedReward {
  key: string;
  coins: number;
  label: string;
}

/** Скін у магазині */
export interface ShopSkin {
  id: string;
  nameUk: string;
  tier: SkinTier;
  price: number;
  rarity: Rarity;
  artKind?: string;
  owned: boolean;
  equipped: boolean;
}

export interface ShopResponse {
  coins: number;
  skins: ShopSkin[];
  ownedSkinIds: string[];
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
  /** target - today (>0 = залишок, <0 = перебір) */
  difference: number;
  /** |consumed - target| — чим менше, тим краще для рейтингу */
  absError: number;
  hasLog: boolean;
  isMe: boolean;
}

export interface ArenaResponse {
  date: string;
  entries: ArenaEntry[];
}

export interface StreakResponse {
  streak: number;
  todayLogged: boolean;
}

export interface QuestStatusDTO {
  id: string;
  weekStart: string;
  code: string;
  titleUk: string;
  description: string;
  kind: string;
  target: number;
  rewardCoins: number;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export interface QuestsResponse {
  weekStart: string;
  weekEnd: string;
  quests: QuestStatusDTO[];
  granted: GrantedReward[];
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
  imageUrl: string | null;
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

/** Відповідь POST /api/meals: збережений прийом + нараховані нагороди */
export interface SaveMealResult extends MealDTO {
  rewards: GrantedReward[];
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
