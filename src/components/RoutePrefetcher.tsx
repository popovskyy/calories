"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getActivities, getArena, getDashboard, getMeals } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

/**
 * Прогріває React Query кеш для сусідніх табів одразу, як застосунок
 * змонтувався — поки користувач ще на поточному екрані. Middleware вже
 * гарантує авторизацію для всього (main)-шелу, тож бити ці ендпоінти
 * безпечно без додаткових перевірок.
 *
 * Не показує нічого і не блокує рендер: якщо запит уже в кеші й не протух
 * (staleTime), React Query сам пропустить мережевий виклик.
 */
export function RoutePrefetcher() {
  const qc = useQueryClient();
  const selectedDate = useAppStore((s) => s.selectedDate);

  useEffect(() => {
    void qc.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    });
    void qc.prefetchQuery({
      queryKey: ["meals", selectedDate],
      queryFn: () => getMeals(selectedDate),
    });
    void qc.prefetchQuery({
      queryKey: ["activities", selectedDate],
      queryFn: () => getActivities(selectedDate),
    });
    void qc.prefetchQuery({
      queryKey: ["arena"],
      queryFn: getArena,
    });
  }, [qc, selectedDate]);

  return null;
}
