import type { DashboardDay } from "@/lib/types";

export interface WeekFilledStats {
  /** Скільки ЗАКРИТИХ днів (до today) мали хоч якісь калорії. */
  loggedDays: number;
  avgNetKcal: number;
  sumNetKcal: number;
  balanceVsTargetKcal: number;
}

/**
 * Статистика поточного тижня за реально заповнені ЗАКРИТІ дні
 * (сума net ÷ кількість днів з їжею, без сьогодні).
 *
 * Сьогодні свідомо виключений: день ще триває, тож "з'їдено 400 із 1900" — це
 * не дефіцит 1500, а просто ще не дописана цифра. Порахувати її як закритий
 * дефіцит означало б показати вигаданий вердикт, який сам собою "зникає"
 * протягом дня. Той самий принцип уже діє в forecast.ts (`date: { lt: today }`)
 * і в quests.ts (`final: date < today`) — тут просто бракувало межі.
 */
export function weekFilledStats(
  days: DashboardDay[],
  target: number,
  today: string,
): WeekFilledStats | null {
  const filled = days.filter(
    (d) =>
      d.date < today &&
      ((d.consumedCalories ?? 0) > 0 || d.totalCalories > 0),
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
