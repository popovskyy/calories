"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMeal,
  deleteMeal,
  generateAvatar,
  getArena,
  getDashboard,
  getMe,
  getMeals,
  login,
  logout,
  register,
  saveMeal,
  saveUser,
  type AnalyzeInput,
  type GenerateAvatarInput,
  type LoginInput,
  type RegisterInput,
  type SaveMealInput,
  type UserInput,
} from "@/lib/api";
import type { MealDTO } from "@/lib/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 30_000,
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
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
    },
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
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["arena"] });
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
