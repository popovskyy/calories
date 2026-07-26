import type {
  ActivityDTO,
  AnalyzeActivityResult,
  AnalyzeResult,
  ArenaResponse,
  CoinTxnDTO,
  DailyCardsResponse,
  DashboardResponse,
  DuelsResponse,
  EpicsResponse,
  ForecastResponse,
  GrantedReward,
  MealDTO,
  NotificationDTO,
  QuestsResponse,
  RecentMealDTO,
  SaveMealResult,
  ShopResponse,
  StreakResponse,
  UserDTO,
} from "./types";
import type { ActivityLevel, Goal, Sex } from "./calories";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  if (!res.ok) {
    let message = `Помилка ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---
export interface LoginInput {
  username: string;
  password: string;
}
export const login = (input: LoginInput) =>
  req<UserDTO>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });

export interface RegisterInput {
  username: string;
  password: string;
  name: string;
  birthYear: number;
  birthMonth: number;
  sex: Sex;
  activityLevel?: ActivityLevel;
  goal: Goal;
  weight: number;
  height: number;
  targetWeight?: number | null;
  targetWeeks?: number | null;
  avatarUrl?: string | null;
  imageBase64?: string;
  imageMimeType?: string;
}
export const register = (input: RegisterInput) =>
  req<UserDTO & { avatarWarning?: string | null }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const logout = () =>
  req<{ ok: true }>("/api/auth/logout", { method: "POST" });

export const getMe = () => req<UserDTO>("/api/auth/me");

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
export const changePassword = (input: ChangePasswordInput) =>
  req<{ ok: true }>("/api/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

// --- Profile ---
export interface UserInput {
  name: string;
  birthYear: number;
  birthMonth: number;
  sex: Sex;
  activityLevel?: ActivityLevel;
  goal: Goal;
  weight: number;
  height: number;
  avatarUrl?: string | null;
  targetWeight?: number | null;
  targetWeeks?: number | null;
}
export const saveUser = (input: UserInput) =>
  req<UserDTO>("/api/users", { method: "POST", body: JSON.stringify(input) });

export interface GenerateAvatarInput {
  imageBase64: string;
  imageMimeType?: string;
  apiKey?: string;
}
export const generateAvatar = (input: GenerateAvatarInput) =>
  req<{ avatarUrl: string }>("/api/avatar/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });

// --- Meals ---
export const getMeals = (date: string) =>
  req<MealDTO[]>(`/api/meals?date=${encodeURIComponent(date)}`);

export const getRecentMeals = (limit = 12) =>
  req<RecentMealDTO[]>(`/api/meals/recent?limit=${limit}`);

export interface AnalyzeInput {
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
  apiKey?: string;
}
export const analyzeMeal = (input: AnalyzeInput) =>
  req<AnalyzeResult>("/api/meals/analyze", {
    method: "POST",
    body: JSON.stringify(input),
  });

export interface SaveMealInput extends AnalyzeInput {
  date: string;
  description: string;
  calories?: number;
  protein?: number;
  fats?: number;
  carbs?: number;
  imageUrl?: string | null;
}
export const saveMeal = (input: SaveMealInput) =>
  req<SaveMealResult>("/api/meals", { method: "POST", body: JSON.stringify(input) });

export const deleteMeal = (id: string) =>
  req<{ ok: true }>(`/api/meals/${id}`, { method: "DELETE" });

export interface UpdateMealInput {
  id: string;
  description: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  date?: string;
}
export const updateMeal = ({ id, ...body }: UpdateMealInput) =>
  req<MealDTO>(`/api/meals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// --- Activities ---
export const getActivities = (date: string) =>
  req<ActivityDTO[]>(`/api/activities?date=${encodeURIComponent(date)}`);

export const analyzeActivityApi = (input: { description: string; apiKey?: string }) =>
  req<AnalyzeActivityResult>("/api/activities/analyze", {
    method: "POST",
    body: JSON.stringify(input),
  });

export interface SaveActivityInput {
  date: string;
  description: string;
  caloriesBurned?: number;
  durationMin?: number | null;
  apiKey?: string;
}
export const saveActivity = (input: SaveActivityInput) =>
  req<ActivityDTO & { notes?: string[]; rewards?: GrantedReward[] }>("/api/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteActivity = (id: string) =>
  req<{ ok: true }>(`/api/activities/${id}`, { method: "DELETE" });

// --- Stats ---
export const getDashboard = (date?: string) =>
  req<DashboardResponse>(
    `/api/stats/dashboard${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

export const getStreak = () => req<StreakResponse>("/api/stats/streak");

export const getArena = () => req<ArenaResponse>("/api/arena");

export const getQuests = (week?: string) =>
  req<QuestsResponse>(
    `/api/quests${week ? `?week=${encodeURIComponent(week)}` : ""}`,
  );

// --- Shop ---
export const getShop = () => req<ShopResponse>("/api/shop");

export const buySkin = (skinId: string) =>
  req<ShopResponse>("/api/shop/buy", {
    method: "POST",
    body: JSON.stringify({ skinId }),
  });

export const equipSkin = (skinId: string) =>
  req<UserDTO>("/api/shop/equip", {
    method: "POST",
    body: JSON.stringify({ skinId }),
  });

export const buyTheme = (themeId: string) =>
  req<ShopResponse>("/api/shop/theme/buy", {
    method: "POST",
    body: JSON.stringify({ themeId }),
  });

export const equipTheme = (themeId: string) =>
  req<UserDTO>("/api/shop/theme/equip", {
    method: "POST",
    body: JSON.stringify({ themeId }),
  });

// --- Спорядження ---
export const buyItem = (itemId: string, fromStall = false) =>
  req<ShopResponse>("/api/items/buy", {
    method: "POST",
    body: JSON.stringify({ itemId, fromStall }),
  });

export interface UseItemResult {
  shop: ShopResponse;
  granted: GrantedReward[];
  /** Що випало зі скриньки (тільки для box). */
  boxLabel: string | null;
  used: string;
}

export const consumeItem = (itemId: string, meta?: string) =>
  req<UseItemResult>("/api/items/use", {
    method: "POST",
    body: JSON.stringify({ itemId, meta }),
  });

export const rerollQuest = (code: string) =>
  req<QuestsResponse>("/api/quests/reroll", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

// --- Косметика ---
export type CosmeticKind = "finisher" | "title" | "frame" | "soundpack";

export const buyCosmetic = (kind: CosmeticKind, cosmeticId: string) =>
  req<ShopResponse>("/api/cosmetics/buy", {
    method: "POST",
    body: JSON.stringify({ kind, cosmeticId }),
  });

export const equipCosmetic = (kind: CosmeticKind, cosmeticId: string | null) =>
  req<ShopResponse>("/api/cosmetics/equip", {
    method: "POST",
    body: JSON.stringify({ kind, cosmeticId }),
  });

// --- Картки дня ---
export const getDailyCards = (date?: string) =>
  req<DailyCardsResponse>(
    `/api/daily-cards${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

// --- Хроніки ---
export const getEpics = () => req<EpicsResponse>("/api/epics");

export const startEpicApi = (epicId: string) =>
  req<EpicsResponse>("/api/epics", {
    method: "POST",
    body: JSON.stringify({ epicId }),
  });

// --- Дуелі ---
export const getDuels = () => req<DuelsResponse>("/api/duels");

export const challengeDuel = (opponentId: string) =>
  req<DuelsResponse>("/api/duels", {
    method: "POST",
    body: JSON.stringify({ action: "challenge", opponentId }),
  });

export const respondDuel = (duelId: string, accept: boolean) =>
  req<DuelsResponse>("/api/duels", {
    method: "POST",
    body: JSON.stringify({ action: accept ? "accept" : "decline", duelId }),
  });

// --- Гаманець ---
export const getWallet = (limit = 60) =>
  req<{ coins: number; txns: CoinTxnDTO[] }>(`/api/wallet?limit=${limit}`);

// --- Forecast ---
export const getForecast = () => req<ForecastResponse>("/api/stats/forecast");

// --- Notifications ---
export interface NotificationsResponse {
  items: NotificationDTO[];
  unreadCount: number;
}

export const getNotifications = () =>
  req<NotificationsResponse>("/api/notifications");

export const markNotificationsRead = (payload: { all?: boolean; ids?: string[] }) =>
  req<{ ok: true }>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// --- Push ---
export interface PushSubscribeInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export const pushSubscribe = (input: PushSubscribeInput) =>
  req<{ ok: true }>("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const pushUnsubscribe = (endpoint?: string) =>
  req<{ ok: true }>("/api/push/subscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });

export const getPushStatus = () =>
  req<{
    publicKey: string | null;
    subscribed: boolean;
    remindersEnabled: boolean;
  }>("/api/push/subscribe");
