/**
 * Один семантичний світлофор на весь застосунок.
 *
 * Правило просте: зелений — у нормі, бурштиновий — на межі, червоний — зірвано.
 * Досі кожне місце вирішувало це саме: плашка героя знала лише «перебір / не
 * перебір», картка цілі красила чіп власним тернарником, а «на межі» взагалі
 * не мало кольору, бо токена не існувало. Через це той самий стан виглядав
 * по-різному на сусідніх блоках.
 *
 * Ключове для цього застосунку: між денною ціллю і підтримкою лежить широка
 * ЧЕСНА зона. Людина, що з'їла трохи над ціллю, але помітно під підтримкою,
 * усе одно худне — це «на межі», а не провал. Червоний лишається за перебором
 * над ПІДТРИМКОЮ, бо саме він ламає ціль.
 */

import type { CalorieStance, Goal } from "@/lib/calories";
import type { DayStatus } from "@/lib/types";

export type StatusTone = "good" | "edge" | "bad" | "neutral";

/**
 * `CalorieStance` не має "unknown" — цей стан живе лише у відповіді прогнозу
 * (`ForecastResponse["calorieStance"]`), коли записів замало для вердикту.
 */
export type StanceOrUnknown = CalorieStance | "unknown";

/** CSS-змінна кольору тону. Теми перевизначають самі значення, не мапінг. */
export function toneColor(tone: StatusTone): string {
  switch (tone) {
    case "good":
      return "var(--color-green)";
    case "edge":
      return "var(--color-amber)";
    case "bad":
      return "var(--color-red)";
    case "neutral":
      return "var(--color-muted2)";
  }
}

/** Приглушена підкладка того ж тону — для чіпів і плашок. */
export function toneBg(tone: StatusTone, pct = 18): string {
  const base = tone === "neutral" ? "var(--color-muted3)" : toneColor(tone);
  return `color-mix(in srgb, ${base} ${pct}%, transparent)`;
}

/**
 * Тон денного стовпчика. `DayStatus` рахується на бекенді
 * (dashboard/route.ts: green ≤ ціль, amber ≤ підтримка на дефіциті, red далі).
 */
export function dayStatusTone(status: DayStatus): StatusTone {
  switch (status) {
    case "green":
      return "good";
    case "amber":
      return "edge";
    case "red":
      return "bad";
  }
}

/**
 * Тон вердикту темпу за їжею.
 *
 * `deep` — глибший за план дефіцит: не «краще за зелене», а привід придивитись,
 * бо надто різкий мінус довго не тримається. Тому «на межі», а не «в нормі».
 */
export function stanceTone(stance: StanceOrUnknown, goal: Goal): StatusTone {
  if (stance === "unknown") return "neutral";
  if (goal === "maintain") {
    switch (stance) {
      case "on_plan":
        return "good";
      case "surplus":
        return "bad";
      default:
        // deep / shallow / maintenance на підтримці — відхилення, але не зрив
        return "edge";
    }
  }
  switch (stance) {
    case "on_plan":
      return "good";
    case "shallow":
    case "maintenance":
    case "deep":
      return "edge";
    case "surplus":
      return "bad";
  }
}

/**
 * Тон живого дня за спожитим net.
 *
 * Поки день триває, «зелений» не означає «день вдався» — лише «ще в межах».
 * Межа бурштинового — денна ціль, червоного — підтримка: та сама шкала, що й
 * у dayBarStatus, щоб плашка героя й стовпчик того ж дня не сперечались.
 */
export function liveDayTone(
  net: number,
  target: number,
  maintenance: number | null,
  goal: Goal,
): StatusTone {
  if (target <= 0) return "neutral";
  if (net <= target) return "good";
  if (goal === "deficit" && maintenance != null && net <= maintenance) {
    return "edge";
  }
  return "bad";
}
