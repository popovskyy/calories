import type { DashboardDay } from "@/lib/types";

export interface WeekFilledStats {
  loggedDays: number;
  avgNetKcal: number;
  sumNetKcal: number;
  balanceVsTargetKcal: number;
}

/**
 * Статистика поточного тижня за реально заповнені дні
 * (сума net ÷ кількість днів з їжею).
 */
export function weekFilledStats(
  days: DashboardDay[],
  target: number,
): WeekFilledStats | null {
  const filled = days.filter(
    (d) => (d.consumedCalories ?? 0) > 0 || d.totalCalories > 0,
  );
  if (filled.length === 0) return null;
  const sumNetKcal = filled.reduce((s, d) => s + d.totalCalories, 0);
  const loggedDays = filled.length;
  return {
    loggedDays,
    sumNetKcal,
    avgNetKcal: Math.round(sumNetKcal / loggedDays),
    balanceVsTargetKcal: Math.round(sumNetKcal - target * loggedDays),
  };
}
