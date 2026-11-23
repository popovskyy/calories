"use client";

import { useEffect, useState } from "react";
import { todayISO } from "@/lib/dates";

/**
 * Локальна «сьогодні» пристрою. До маунта — null (SSR живе в UTC і дав би іншу дату →
 * hydration mismatch). Оновлюється, коли застосунок повертається на екран: iOS PWA
 * не перезавантажується, тож після ночі в фоні «сьогодні» інакше лишилось би вчорашнім.
 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setToday(todayISO());
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return today;
}
