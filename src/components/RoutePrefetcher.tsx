"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getActivities, getDashboard, getMeals } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

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
  }, [qc, selectedDate]);

  return null;
}
