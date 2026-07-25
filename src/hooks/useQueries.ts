"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMeal,
  analyzeActivityApi,
  buySkin,
  buyTheme,
  changePassword,
  deleteActivity,
  deleteMeal,
  equipSkin,
  equipTheme,
  generateAvatar,
  getActivities,
  getArena,
  getDashboard,
  getForecast,
  getMe,
  getMeals,
  getNotifications,
  getQuests,
  getRecentMeals,
  getShop,
  getStreak,
  login,
  logout,
  markNotificationsRead,
  register,
  saveActivity,
  saveMeal,
  saveUser,
  updateMeal,
  type AnalyzeInput,
  type ChangePasswordInput,
  type GenerateAvatarInput,
  type LoginInput,
  type RegisterInput,
  type SaveActivityInput,
  type SaveMealInput,
  type UpdateMealInput,
  type UserInput,
} from "@/lib/api";
import type { MealDTO } from "@/lib/types";
import type { NotificationsResponse } from "@/lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

/** Поточний залогінений користувач (сесія). */
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
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}

export function useGenerateAvatar() {
  return useMutation({
    mutationFn: (input: GenerateAvatarInput) => generateAvatar(input),
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["meals", vars.date] });
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["me"] }); // баланс монет
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}

export function useUpdateMeal(listDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMealInput) => updateMeal(input),
    onSuccess: (updated, vars) => {
      const dates = new Set([listDate, updated.date, vars.date].filter(Boolean) as string[]);
      for (const d of dates) {
        qc.invalidateQueries({ queryKey: ["meals", d] });
      }
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["activities", vars.date] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}

export function useDeleteActivity(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", date] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}

export function useArena() {
  return useQuery({
    queryKey: ["arena"],
    queryFn: getArena,
    refetchInterval: 60_000,
  });
}

export function useQuests() {
  return useQuery({
    queryKey: ["quests"],
    queryFn: () => getQuests(),
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

// --- Shop ---
export function useShop() {
  return useQuery({
    queryKey: ["shop"],
    queryFn: getShop,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useBuySkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skinId: string) => buySkin(skinId),
    onSuccess: (shop) => {
      qc.setQueryData(["shop"], shop);
      qc.invalidateQueries({ queryKey: ["me"] }); // списані монети
    },
  });
}

export function useEquipSkin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skinId: string) => equipSkin(skinId),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      qc.invalidateQueries({ queryKey: ["shop"] }); // прапорці equipped
      qc.invalidateQueries({ queryKey: ["arena"] }); // аватар в арені
    },
  });
}

// --- Forecast ---
export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: getForecast,
    staleTime: 60_000,
  });
}

// --- Notifications ---
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { all?: boolean; ids?: string[] }) =>
      markNotificationsRead(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<NotificationsResponse>(["notifications"]);
      qc.setQueryData<NotificationsResponse>(["notifications"], (old) => {
        if (!old) return old;
        const items = old.items.map((n) =>
          payload.all || payload.ids?.includes(n.id) ? { ...n, read: true } : n,
        );
        return { items, unreadCount: 0 };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// --- Theme shop ---
export function useBuyTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (themeId: string) => buyTheme(themeId),
    onSuccess: (shop) => {
      qc.setQueryData(["shop"], shop);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useEquipTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (themeId: string) => equipTheme(themeId),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      qc.invalidateQueries({ queryKey: ["shop"] });
      // Миттєво застосовуємо тему
      document.documentElement.dataset.theme = user.theme;
    },
  });
}
