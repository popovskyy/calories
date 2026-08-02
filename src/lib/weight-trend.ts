/**
 * Темп ваги з журналу зважувань — методом найменших квадратів.
 *
 * Навіщо не «(поточна − старт) / календарні дні»: та оцінка стоїть на двох
 * точках і на календарі. Одне «водяне» зважування зсуває весь прогноз, а якщо
 * перестати зважуватись — чисельник заморожений, знаменник росте, і дата цілі
 * щодня відсувається сама собою, хоча нічого не сталося.
 *
 * Тут темп рахується по всіх зважуваннях у вікні, тож окремий сплеск важить
 * рівно стільки, скільки має, а «застарілі дані» — окремий стан, не повільний
 * темп (див. `staleDays` і `WEIGH_IN_STALE_DAYS`).
 */

import { fromYMD } from "@/lib/date";

/** Скільки останніх зважувань беремо в регресію. */
const MAX_SAMPLES = 30;
/** Вікно історії — старіші зважування вже не описують поточний темп. */
export const TREND_WINDOW_DAYS = 60;
/** Менше — це ще не тренд, а два випадкові числа. */
export const MIN_TREND_SAMPLES = 3;
/**
 * Коротший розкид дат дає нахил, зшитий із добових коливань води.
 *
 * Експортується, бо UI має пояснювати ПРИЧИНУ відсутності прогнозу: «5
 * зважувань за 4 дні» — це не «мало зважувань», а «замало часу між ними»,
 * і плутати ці два стани означає казати користувачу неправду про його дані.
 */
export const MIN_TREND_SPAN_DAYS = 7;
/** Після стількох днів без ваги темп рахується протухлим. */
export const WEIGH_IN_STALE_DAYS = 14;

export interface WeightPointYMD {
  /** YYYY-MM-DD */
  date: string;
  weight: number;
}

export interface WeightTrend {
  /** кг/день: <0 — схуднення, >0 — набір. null — даних мало для тренду. */
  ratePerDay: number | null;
  /** Скільки зважувань потрапило у вікно. */
  samples: number;
  /** Днів між першим і останнім зважуванням у вікні. */
  spanDays: number;
  /** Дата останнього зважування (YYYY-MM-DD) або null. */
  lastDate: string | null;
  /** Днів від останнього зважування до `today`. */
  staleDays: number;
  /** Останнє зважування давніше за WEIGH_IN_STALE_DAYS. */
  stale: boolean;
}

export function daysBetweenYMD(fromYmd: string, toYmd: string): number {
  const a = fromYMD(fromYmd).getTime();
  const b = fromYMD(toYmd).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Нахил зважувань у кг/день. `points` можуть іти в будь-якому порядку і
 * містити дублікати дат — беремо останній запис на дату.
 */
export function weightTrend(
  points: readonly WeightPointYMD[],
  today: string,
): WeightTrend {
  const byDate = new Map<string, number>();
  for (const p of points) {
    if (!Number.isFinite(p.weight)) continue;
    byDate.set(p.date, p.weight);
  }

  const sorted = [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (sorted.length === 0) {
    return {
      ratePerDay: null,
      samples: 0,
      spanDays: 0,
      lastDate: null,
      staleDays: 0,
      stale: false,
    };
  }

  const lastDate = sorted[sorted.length - 1]!.date;
  const staleDays = Math.max(0, daysBetweenYMD(lastDate, today));

  // Вікно рахуємо від останнього зважування, а не від «сьогодні»: інакше в
  // людини, яка не ставала на ваги місяць, вікно порожніє і темп зникає
  // мовчки. Хай краще буде явний `stale`.
  const windowed = sorted
    .filter((p) => daysBetweenYMD(p.date, lastDate) <= TREND_WINDOW_DAYS)
    .slice(-MAX_SAMPLES);

  const first = windowed[0]!;
  const spanDays = daysBetweenYMD(first.date, lastDate);

  const base: WeightTrend = {
    ratePerDay: null,
    samples: windowed.length,
    spanDays,
    lastDate,
    staleDays,
    stale: staleDays > WEIGH_IN_STALE_DAYS,
  };

  if (windowed.length < MIN_TREND_SAMPLES || spanDays < MIN_TREND_SPAN_DAYS) return base;

  // Найменші квадрати по (день від першого зважування, вага).
  const xs = windowed.map((p) => daysBetweenYMD(first.date, p.date));
  const ys = windowed.map((p) => p.weight);
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    num += dx * (ys[i]! - meanY);
    den += dx * dx;
  }

  // den === 0 неможливий при spanDays >= MIN_TREND_SPAN_DAYS, але ділити наосліп не варто.
  if (den === 0) return base;

  return { ...base, ratePerDay: num / den };
}
