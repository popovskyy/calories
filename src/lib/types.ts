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
  /** Активна тема оформлення */
  theme: string;
  /** Куплені преміум themeId */
  ownedThemeIds: string[];
  /** Вдягнений фінішер — анімація закриття дня */
  finisher: string;
  /** Титул під ніком в арені (null = без титулу) */
  title: string | null;
  /** Рамка аватара */
  frame: string | null;
  soundpack: string;
  /** Рекорд серії — від нього залежить стадія маскота */
  maxStreak: number;
  targetWeight: number | null;
  targetWeeks: number | null;
  startWeight: number | null;
  startWeightDate: string | null;
  remindersEnabled: boolean;
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
  /** Backup старого avatarUrl при активному покаранні (null = не активне). */
  peppaPunishBackupAvatarUrl: string | null;
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

export interface ShopTheme {
  id: string;
  nameUk: string;
  tier: "free" | "premium";
  price: number;
  swatch: string;
  vibe: string;
  previewBg: string;
  previewAccent: string;
  comingSoon?: boolean;
  owned: boolean;
  equipped: boolean;
}

/** Витратний предмет у магазині + скільки його вже в інвентарі. */
export interface ShopItem {
  id: string;
  nameUk: string;
  description: string;
  price: number;
  icon: string;
  qty: number;
  maxStack: number | null;
  passive: boolean;
  /** Досягнуто стелі інвентаря — купувати більше не можна. */
  full: boolean;
}

/** Косметика нового типу (фінішер / титул / рамка / саундпак). */
export interface ShopCosmetic {
  id: string;
  kind: "finisher" | "title" | "frame" | "soundpack";
  nameUk: string;
  description: string;
  price: number;
  swatch: string;
  owned: boolean;
  equipped: boolean;
  /** Не продається — здобувається досягненням. */
  earnedOnly: boolean;
  /** Умова відкриття для заблокованої картки. */
  hint: string | null;
}

/** Слот ротаційного прилавка. */
export interface ShopStallSlot {
  kind: string;
  refId: string;
  cosmeticKind?: string;
  nameUk: string;
  description: string;
  price: number;
  oldPrice: number | null;
  icon: string;
  swatch: string | null;
  /** Уже куплено цього тижня (1 слот = 1 покупка). */
  bought: boolean;
}

export interface ShopResponse {
  coins: number;
  skins: ShopSkin[];
  ownedSkinIds: string[];
  themes: ShopTheme[];
  ownedThemeIds: string[];
  items: ShopItem[];
  cosmetics: ShopCosmetic[];
  stall: ShopStallSlot[];
  /** ISO-час наступного оновлення прилавка (понеділок 00:00 Kyiv). */
  stallResetsAt: string;
  /** Стадія еволюції вдягненого маскота, 1–4. */
  evolutionStage: number;
  maxStreak: number;
  inTargetDays: number;
}

/** Одна операція в гаманці. */
export interface CoinTxnDTO {
  id: string;
  delta: number;
  kind: string;
  label: string;
  createdAt: string;
}

export interface DailyCardDTO {
  code: string;
  titleUk: string;
  description: string;
  icon: string;
  slot: number;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  rewardCoins: number;
}

export interface DailyCardsResponse {
  date: string;
  cards: DailyCardDTO[];
  granted: GrantedReward[];
}

export interface EpicNodeDTO {
  at: number;
  nameUk: string;
  loreUk: string;
  coins: number;
  reached: boolean;
  claimed: boolean;
}

export interface EpicStatusDTO {
  epicId: string;
  nameUk: string;
  tagline: string;
  icon: string;
  unit: string;
  total: number;
  progress: number;
  remaining: number;
  active: boolean;
  background: boolean;
  started: boolean;
  completed: boolean;
  nodes: EpicNodeDTO[];
}

export interface EpicsResponse {
  epics: EpicStatusDTO[];
  granted: GrantedReward[];
}

/** Стан фонду підйомних — страховки для гравця без монет. */
export interface ReliefStatus {
  available: boolean;
  claimedThisWeek: boolean;
  amount: number;
  threshold: number;
  coins: number;
}

export interface NotificationDTO {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Розбір раціону від ШІ. Не готовий лише тоді, коли за день ще нічого не
 * записано — тоді картка мовчить, бо коментувати нічого.
 */
/**
 * Звіт дня — один раз на добу, на прохання, а не фоном.
 * - locked: ще не 17:00, кнопка недоступна.
 * - no_meals: 17:00 настало, але за день нема жодного запису їжі.
 * - requestable: 17:00 настало, є що аналізувати — кнопка активна, чекає тапу.
 * - ready: користувач натиснув, ШІ відповів — показуємо текст, кнопки більше нема.
 */
export type AdviceResponse =
  | { state: "locked" }
  | { state: "no_meals" }
  | { state: "requestable" }
  | {
      state: "ready";
      date: string;
      headline: string;
      body: string;
      tip: string;
      mood: "good" | "mixed" | "over";
    };

export interface ForecastResponse {
  configured: boolean;
  startWeight: number | null;
  /** Дата, від якої рахується ціль (YYYY-MM-DD) — початок осі графіка. */
  startWeightDate: string | null;
  currentWeight: number | null;
  targetWeight: number | null;
  expectedWeight: number | null;
  deltaActual: number | null;
  plannedWeightToday: number | null;
  targetDate: string | null;
  daysLeft: number | null;
  loggedDays: number;
  totalDays: number;
  scheduleStatus: "ahead" | "on" | "behind" | "unknown";
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
  /** |consumed - target| — тайбрейк рейтингу і призовий гейт ±15% */
  absError: number;
  /** Очки дня 0–100 — основа рейтингу (див. dayScore в lib/arena.ts). */
  score: number;
  /** Макроси за день — показуємо в картці гравця. */
  protein: number;
  fats: number;
  carbs: number;
  /** Скільки прийомів їжі записано сьогодні. */
  mealsCount: number;
  /** Досягнення: рекорд серії і скільки днів закрито в ±5%. */
  maxStreak: number;
  inTargetDays: number;
  hasLog: boolean;
  /** Чи є хоч один запис їжі — лише такі дні беруть участь у призах арени. */
  hasMeal: boolean;
  isMe: boolean;
  /** Готова назва титулу для показу під ніком. */
  title: string | null;
  frame: string | null;
  /** Стадія еволюції маскота 1–4. */
  stage: number;
}

/** Рядок вчорашнього подіуму: хто виграв і скільки монет отримав. */
export interface ArenaYesterdayEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  coins: number;
  isMe: boolean;
}

export interface ArenaResponse {
  date: string;
  entries: ArenaEntry[];
  /** Топ-3 закритого вчорашнього дня; порожньо, якщо ніхто не вів журнал. */
  yesterday: ArenaYesterdayEntry[];
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
  /** Квест замінено ре-ролом. */
  rerolled: boolean;
}

export interface QuestsResponse {
  weekStart: string;
  weekEnd: string;
  quests: QuestStatusDTO[];
  granted: GrantedReward[];
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
