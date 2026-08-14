"use client";

import { useEffect, useRef } from "react";
import { todayYMD } from "@/lib/date";
import { selectedDateAfterCalendarDayChange } from "@/lib/selected-date-sync";
import { useAppStore } from "@/store/useAppStore";

/**
 * Синхронізує selectedDate з «сьогодні» після resume PWA, коли календарний
 * день змінився, поки застосунок був у фоні.
 */
export function SelectedDateSync() {
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const todayWhenHiddenRef = useRef(todayYMD());

  useEffect(() => {
    const syncIfNeeded = () => {
      const todayNow = todayYMD();
      const next = selectedDateAfterCalendarDayChange(
        useAppStore.getState().selectedDate,
        todayWhenHiddenRef.current,
        todayNow,
      );
      if (next) setSelectedDate(next);
      todayWhenHiddenRef.current = todayNow;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        todayWhenHiddenRef.current = todayYMD();
        return;
      }
      syncIfNeeded();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) syncIfNeeded();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [setSelectedDate]);

  return null;
}
