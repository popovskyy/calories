import type {
  ActivityDTO,
  AnalyzeActivityResult,
  AnalyzeResult,
  DashboardResponse,
  ForecastResponse,
  MealDTO,
  RecentActivityDTO,
  RecentMealDTO,
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
  avatarUrl?: string | null;
}
export const register = (input: RegisterInput) =>
  req<UserDTO>("/api/auth/register", {
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
  theme?: string;
}
export const saveUser = (input: UserInput) =>
  req<UserDTO>("/api/users", { method: "POST", body: JSON.stringify(input) });

export const getMeals = (date: string) =>
  req<MealDTO[]>(`/api/meals?date=${encodeURIComponent(date)}`);

export const getRecentActivities = (limit = 10) =>
  req<RecentActivityDTO[]>(`/api/activities/recent?limit=${limit}`);

export const getRecentMeals = (limit = 12) =>
  req<RecentMealDTO[]>(`/api/meals/recent?limit=${limit}`);

export interface AnalyzeInput {
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
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
  hasPhoto?: boolean;
}
export const saveMeal = (input: SaveMealInput) =>
  req<MealDTO>("/api/meals", { method: "POST", body: JSON.stringify(input) });

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

export const getActivities = (date: string) =>
  req<ActivityDTO[]>(`/api/activities?date=${encodeURIComponent(date)}`);

export const analyzeActivityApi = (input: { description: string }) =>
  req<AnalyzeActivityResult>("/api/activities/analyze", {
    method: "POST",
    body: JSON.stringify(input),
  });

export interface SaveActivityInput {
  date: string;
  description: string;
  caloriesBurned?: number;
  durationMin?: number | null;
}
export const saveActivity = (input: SaveActivityInput) =>
  req<ActivityDTO & { notes?: string[] }>("/api/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteActivity = (id: string) =>
  req<{ ok: true }>(`/api/activities/${id}`, { method: "DELETE" });

export const getDashboard = (date?: string) =>
  req<DashboardResponse>(
    `/api/stats/dashboard${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

export const getStreak = () => req<StreakResponse>("/api/stats/streak");

export interface WeightPoint {
  date: string;
  weight: number;
}

export const getWeightHistory = () =>
  req<{ items: WeightPoint[] }>("/api/weight");

export const logWeight = (weight: number) =>
  req<{ ok: boolean; date: string; weight: number }>("/api/weight", {
    method: "POST",
    body: JSON.stringify({ weight }),
  });

export const getForecast = () => req<ForecastResponse>("/api/stats/forecast");
