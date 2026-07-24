import type {
  AnalyzeResult,
  DashboardResponse,
  MealDTO,
  UserDTO,
} from "./types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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

// --- Users ---
export const getUsers = () => req<UserDTO[]>("/api/users");

export interface UserInput {
  id?: string;
  name: string;
  targetCalories: number;
  age?: number;
  weight?: number;
  height?: number;
}
export const saveUser = (input: UserInput) =>
  req<UserDTO>("/api/users", { method: "POST", body: JSON.stringify(input) });

// --- Meals ---
export const getMeals = (userId: string, date: string) =>
  req<MealDTO[]>(`/api/meals?userId=${encodeURIComponent(userId)}&date=${date}`);

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
  userId: string;
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
export const getDashboard = (userId: string, date?: string) =>
  req<DashboardResponse>(
    `/api/stats/dashboard?userId=${encodeURIComponent(userId)}${
      date ? `&date=${date}` : ""
    }`,
  );
