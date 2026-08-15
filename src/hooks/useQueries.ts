"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMeal,
  analyzeActivityApi,
  changePassword,
  deleteActivity,
  deleteMeal,
  getActivities,
  getDashboard,
  getForecast,
  getMe,
  getMeals,
  getRecentActivities,
  getRecentMeals,
  getStreak,
  getWeightHistory,
  login,
  logout,
  logWeight,
  register,
  saveActivity,
  saveMeal,
  saveUser,
  updateMeal,
  type AnalyzeInput,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type SaveActivityInput,
  type SaveMealInput,
  type UpdateMealInput,
  type UserInput,
} from "@/lib/api";
import type { ActivityDTO, MealDTO } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

function armRecalc(delta: number) {
  if (!delta) return;
  useAppStore.getState().armRecalc(delta);
}

const dayKeys = [
  "dashboard",
  "streak",
  "forecast",
  "me",
] as const;

function invalidateDay(qc: ReturnType<typeof useQueryClient>) {
  for (const key of dayKeys) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const u = q.state.data;
      return u && (!u.approved || u.blocked) ? 8_000 : false;
    },
  });
}

export function useCurrentUser() {
  const me = useMe();
  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    isError: me.isError,
    refetch: me.refetch,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      qc.clear();
      window.location.href = "/login";
    },
  });
}

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => saveUser(input),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
}

export function useMeals(date: string) {
  return useQuery({
    queryKey: ["meals", date],
    queryFn: () => getMeals(date),
  });
}

export function useAnalyzeMeal() {
  return useMutation({
    mutationFn: (input: AnalyzeInput) => analyzeMeal(input),
  });
}

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMealInput) => saveMeal(input),
    onSuccess: (data, vars) => {
      armRecalc(data.calories);
      qc.invalidateQueries({ queryKey: ["meals", vars.date] });
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      invalidateDay(qc);
    },
  });
}

export function useRecentMeals(limit = 12) {
  return useQuery({
    queryKey: ["meals", "recent", limit],
    queryFn: () => getRecentMeals(limit),
    staleTime: 30_000,
  });
}

export function useRecentActivities(limit = 10) {
  return useQuery({
    queryKey: ["activities", "recent", limit],
    queryFn: () => getRecentActivities(limit),
    staleTime: 30_000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: ["streak"],
    queryFn: getStreak,
    staleTime: 30_000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}

export function useDeleteMeal(date: string) {
  const qc = useQueryClient();
  const key = ["meals", date];
  return useMutation({
    mutationFn: (id: string) => deleteMeal(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MealDTO[]>(key);
      qc.setQueryData<MealDTO[]>(key, (old) => old?.filter((m) => m.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (_data, id, ctx) => {
      const removed = ctx?.prev?.find((m) => m.id === id);
      armRecalc(-(removed?.calories ?? 0));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      invalidateDay(qc);
    },
  });
}

export function useUpdateMeal(listDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMealInput) => updateMeal(input),
    onSuccess: (updated, vars) => {
      const before = qc
        .getQueryData<MealDTO[]>(["meals", listDate])
        ?.find((m) => m.id === updated.id);
      if (before) armRecalc(updated.calories - before.calories);

      const dates = new Set([listDate, updated.date, vars.date].filter(Boolean) as string[]);
      for (const d of dates) {
        qc.invalidateQueries({ queryKey: ["meals", d] });
      }
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      invalidateDay(qc);
    },
  });
}

export function useActivities(date: string) {
  return useQuery({
    queryKey: ["activities", date],
    queryFn: () => getActivities(date),
  });
}

export function useAnalyzeActivity() {
  return useMutation({
    mutationFn: (input: { description: string }) => analyzeActivityApi(input),
  });
}

export function useSaveActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveActivityInput) => saveActivity(input),
    onSuccess: (data, vars) => {
      armRecalc(-data.caloriesBurned);
      qc.invalidateQueries({ queryKey: ["activities", vars.date] });
      qc.invalidateQueries({ queryKey: ["activities", "recent"] });
      invalidateDay(qc);
    },
  });
}

export function useDeleteActivity(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: (_data, id) => {
      const removed = qc
        .getQueryData<ActivityDTO[]>(["activities", date])
        ?.find((a) => a.id === id);
      armRecalc(removed?.caloriesBurned ?? 0);
      qc.invalidateQueries({ queryKey: ["activities", date] });
      invalidateDay(qc);
    },
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: getForecast,
    staleTime: 60_000,
  });
}

export function useWeightHistory() {
  return useQuery({
    queryKey: ["weight-history"],
    queryFn: getWeightHistory,
    staleTime: 60_000,
  });
}

export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weight: number) => logWeight(weight),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weight-history"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
