/**
 * Дати плану — це рядки "YYYY-MM-DD" без часового поясу.
 * "Сьогодні" і понеділок тижня рахує КЛІЄНТ у локальному часі пристрою
 * (сервер на Vercel живе в UTC — на межі доби дав би інший день). Уся арифметика
 * далі йде через UTC-полуночі, тому не залежить ні від зсуву пояса, ні від DST.
 */

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт"] as const;
export const WEEKDAY_LONG = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"] as const;

const WEEKDAY_FULL = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця", "Субота", "Неділя"] as const;

const MONTHS_SHORT = [
  "січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру",
] as const;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseISO(iso: string): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Некоректна дата: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function formatUTC(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Рядок — існуюча календарна дата (відсікає 2026-02-31). */
export function isISODate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_RE.test(s)) return false;
  return formatUTC(parseISO(s)) === s;
}

/** Локальна дата пристрою → "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, "0");
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const da = String(now.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatUTC(d);
}

/** Пн = 0 … Нд = 6. */
export function weekdayIndex(iso: string): number {
  return (parseISO(iso).getUTCDay() + 6) % 7;
}

export function isMonday(iso: string): boolean {
  return weekdayIndex(iso) === 0;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

/** Пн–Пт → цей тиждень; Сб/Нд → наступний (план лише на робочі дні). */
export function defaultWeekStart(today: string): string {
  const monday = mondayOf(today);
  return weekdayIndex(today) >= 5 ? addDays(monday, 7) : monday;
}

/** "23 лис" */
export function formatDayMonth(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** "23–27 лис" або "28 лис – 2 гру" */
export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 4);
  const a = parseISO(weekStart);
  const b = parseISO(end);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]}`;
  }
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(end)}`;
}

/** "Понеділок, 23 лис" */
export function formatDateLong(iso: string): string {
  return `${WEEKDAY_FULL[weekdayIndex(iso)]}, ${formatDayMonth(iso)}`;
}

/** «Сьогодні» / «Завтра» / «Вчора» або null, якщо дата далі за добу від `today`. */
export function relativeDayLabel(iso: string, today: string): string | null {
  if (iso === today) return "Сьогодні";
  if (iso === addDays(today, 1)) return "Завтра";
  if (iso === addDays(today, -1)) return "Вчора";
  return null;
}

/** Лише назва дня: «Понеділок» (для великого заголовка, що не переноситься). */
export function weekdayFullName(iso: string): string {
  return WEEKDAY_FULL[weekdayIndex(iso)];
}
