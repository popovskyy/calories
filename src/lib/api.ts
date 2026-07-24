import type {
  AnalyzeResult,
  ArenaResponse,
  DashboardResponse,
  MealDTO,
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
  activityLevel: ActivityLevel;
  goal: Goal;
  weight: number;
  height: number;
  avatarUrl?: string | null;
  imageBase64?: string;
  imageMimeType?: string;
}
export const register = (input: RegisterInput) =>
  req<UserDTO>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const logout = () =>
  req<{ ok: true }>("/api/auth/logout", { method: "POST" });

export const getMe = () => req<UserDTO>("/api/auth/me");

// --- Profile ---
export interface UserInput {
  name: string;
  birthYear: number;
  birthMonth: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
  weight: number;
  height: number;
  avatarUrl?: string | null;
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
  req<MealDTO>("/api/meals", { method: "POST", body: JSON.stringify(input) });

export const deleteMeal = (id: string) =>
  req<{ ok: true }>(`/api/meals/${id}`, { method: "DELETE" });

// --- Stats ---
export const getDashboard = (date?: string) =>
  req<DashboardResponse>(
    `/api/stats/dashboard${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

export const getArena = () => req<ArenaResponse>("/api/arena");
