"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMeal,
  analyzeActivityApi,
  buyCosmetic,
  buyItem,
  buySkin,
  buyTheme,
  claimReliefApi,
  changePassword,
  deleteActivity,
  deleteMeal,
  equipCosmetic,
  equipSkin,
  equipTheme,
  generateAvatar,
  getActivities,
  getAdvice,
  getArena,
  getDailyCards,
  getDashboard,
  getEpics,
  getForecast,
  getMe,
  getMeals,
  getNotifications,
  getQuests,
  getRecentActivities,
  getRecentMeals,
  getRelief,
  getShop,
  getStreak,
  getWallet,
  getWeightHistory,
  login,
  logout,
  logWeight,
  markNotificationsRead,
  nudgeUser,
  register,
  rerollQuest,
  saveActivity,
  saveMeal,
  saveUser,
  startEpicApi,
  updateMeal,
  consumeItem,
  type AnalyzeInput,
  type ChangePasswordInput,
  type CosmeticKind,
  type GenerateAvatarInput,
  type LoginInput,
  type RegisterInput,
  type SaveActivityInput,
  type SaveMealInput,
  type UpdateMealInput,
  type UserInput,
} from "@/lib/api";
import type { ActivityDTO, MealDTO } from "@/lib/types";
import type { NotificationsResponse } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

/**
 * Зводить курок ритуалу «підкидання дровини». Викликається з мутацій поза
 * React-рендером, тому беремо стан напряму зі стора, а не через хук.
 */
function armRecalc(delta: number) {
  if (!delta) return;
  useAppStore.getState().armRecalc(delta);
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    // Поки доступ закритий (черга на апрув або блокування) — підтягуємо
    // статус самі, щоб оверлей зник без перезавантаження сторінки.
    refetchInterval: (q) => {
      const u = q.state.data;
      return u && (!u.approved || u.blocked) ? 8_000 : false;
    },
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
    onSuccess: (data, vars) => {
      // беремо збережене значення, а не вхідне: калорії міг порахувати ШІ
      armRecalc(data.calories);
      qc.invalidateQueries({ queryKey: ["meals", vars.date] });
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["me"] }); // баланс монет
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["daily-cards"] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      // Нова вечеря змінює розбір дня — сервер перегенерує його за mealCount.
      qc.invalidateQueries({ queryKey: ["advice"] });
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
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      // Видалення може відкотити прогрес квестів/карток — перечитуємо.
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["daily-cards"] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["advice"] });
    },
  });
}

export function useUpdateMeal(listDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMealInput) => updateMeal(input),
    onSuccess: (updated, vars) => {
      // кеш ще тримає доредакційний запис — інвалідація нижче
      const before = qc
        .getQueryData<MealDTO[]>(["meals", listDate])
        ?.find((m) => m.id === updated.id);
      if (before) armRecalc(updated.calories - before.calories);

      const dates = new Set([listDate, updated.date, vars.date].filter(Boolean) as string[]);
      for (const d of dates) {
        qc.invalidateQueries({ queryKey: ["meals", d] });
      }
      qc.invalidateQueries({ queryKey: ["meals", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["daily-cards"] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["advice"] });
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
      // активність зменшує денний баланс — дровина летить «у мінус»
      armRecalc(-data.caloriesBurned);
      qc.invalidateQueries({ queryKey: ["activities", vars.date] });
      qc.invalidateQueries({ queryKey: ["activities", "recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["daily-cards"] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
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

/** Штурхан суперника з арени. */
export function useNudge() {
  return useMutation({
    mutationFn: (userId: string) => nudgeUser(userId),
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

/**
 * Звіт дня / тижневий фідбек. Сервер сам тримає стан
 * (locked / no_meals / requestable / ready) — поки він "locked", перепитуємо
 * раз на хвилину, щоб кнопка сама розблокувалась о 18:00 (денний) /
 * 15:00 (тижневий) без перезавантаження. В решті станів опитування не
 * потрібне: "ready" не зміниться до завтра / наступного тижня, а
 * "requestable"/"no_meals" інвалідується вручну при збереженні/видаленні
 * їжі (див. useSaveMeal тощо).
 */
export function useAdvice() {
  return useQuery({
    queryKey: ["advice"],
    queryFn: () => getAdvice(),
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.state === "locked" ? 60_000 : false,
    retry: false,
  });
}

/** Кнопка «Дізнатись вердикт» — просить ШІ згенерувати звіт саме зараз. */
export function useForceAdvice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getAdvice(true),
    onSuccess: (data) => qc.setQueryData(["advice"], data),
  });
}

// --- Вага ---
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
      qc.invalidateQueries({ queryKey: ["me"] }); // вага + перерахована норма
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["epics"] }); // ваговий епік і плато
    },
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

// --- Картки дня ---
export function useDailyCards() {
  return useQuery({
    queryKey: ["daily-cards"],
    queryFn: () => getDailyCards(),
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

// --- Спорядження ---
export function useBuyItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, fromStall }: { itemId: string; fromStall?: boolean }) =>
      buyItem(itemId, fromStall ?? false),
    onSuccess: (shop) => {
      qc.setQueryData(["shop"], shop);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useUseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, meta }: { itemId: string; meta?: string }) =>
      consumeItem(itemId, meta),
    onSuccess: (res) => {
      qc.setQueryData(["shop"], res.shop);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      // Ре-рол міняє склад карток і квестів, тож їх треба перечитати.
      qc.invalidateQueries({ queryKey: ["daily-cards"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
    },
  });
}

// --- Косметика ---
export function useBuyCosmetic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: CosmeticKind; id: string }) =>
      buyCosmetic(kind, id),
    onSuccess: (shop) => {
      qc.setQueryData(["shop"], shop);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useEquipCosmetic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: CosmeticKind; id: string | null }) =>
      equipCosmetic(kind, id),
    onSuccess: (shop) => {
      qc.setQueryData(["shop"], shop);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["arena"] }); // титул і рамка видно іншим
    },
  });
}

// --- Хроніки ---
export function useEpics() {
  return useQuery({
    queryKey: ["epics"],
    queryFn: getEpics,
    staleTime: 60_000,
  });
}

export function useStartEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (epicId: string) => startEpicApi(epicId),
    onSuccess: (data) => {
      qc.setQueryData(["epics"], data);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/** Стан фонду підйомних. */
export function useRelief() {
  return useQuery({
    queryKey: ["relief"],
    queryFn: getRelief,
    staleTime: 30_000,
  });
}

/** Підйомні з фонду — розблоковують гравця з порожнім гаманцем. */
export function useClaimRelief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => claimReliefApi(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["relief"] });
    },
  });
}

export function useRerollQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => rerollQuest(code),
    onSuccess: (data) => {
      qc.setQueryData(["quests"], data);
      qc.invalidateQueries({ queryKey: ["shop"] }); // витрачений предмет
    },
  });
}

// --- Гаманець ---
export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => getWallet(),
    staleTime: 15_000,
  });
}
