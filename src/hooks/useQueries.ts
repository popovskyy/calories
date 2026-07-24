"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMeal,
  deleteMeal,
  getDashboard,
  getMeals,
  getUsers,
  saveMeal,
  saveUser,
  type AnalyzeInput,
  type SaveMealInput,
  type UserInput,
} from "@/lib/api";
import type { MealDTO } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: getUsers });
}

/** Поточний профіль + авто-вибір першого, якщо не задано або зник */
export function useCurrentUser() {
  const usersQuery = useUsers();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const users = usersQuery.data;

  useEffect(() => {
    if (!users) return;
    const exists = currentUserId && users.some((u) => u.id === currentUserId);
    if (!exists) {
      setCurrentUserId(users[0]?.id ?? null);
    }
  }, [users, currentUserId, setCurrentUserId]);

  const user =
    users?.find((u) => u.id === currentUserId) ?? users?.[0] ?? null;

  return {
    user,
    users: users ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
  };
}

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => saveUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDashboard(userId: string | null) {
  return useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => getDashboard(userId!),
    enabled: !!userId,
  });
}

export function useMeals(userId: string | null, date: string) {
  return useQuery({
    queryKey: ["meals", userId, date],
    queryFn: () => getMeals(userId!, date),
    enabled: !!userId,
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
      qc.invalidateQueries({ queryKey: ["meals", vars.userId, vars.date] });
      qc.invalidateQueries({ queryKey: ["dashboard", vars.userId] });
    },
  });
}

export function useDeleteMeal(userId: string | null, date: string) {
  const qc = useQueryClient();
  const key = ["meals", userId, date];
  return useMutation({
    mutationFn: (id: string) => deleteMeal(id),
    // Оптимістичне видалення — картка зникає одразу з анімацією
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
      qc.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
}
