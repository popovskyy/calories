/** Хелпери роботи з датами у форматі YYYY-MM-DD (локальний час) */

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

/** Дата зі зсувом на N днів від base (за замовчуванням — сьогодні) */
export function shiftYMD(ymd: string, deltaDays: number): string {
  const d = fromYMD(ymd);
  d.setDate(d.getDate() + deltaDays);
  return toYMD(d);
}

export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Масив останніх `count` дат, що закінчуються `end` (включно), від найстарішої */
export function lastNDays(end: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftYMD(end, -i));
  return out;
}

const WEEKDAYS_UK = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_UK = [
  "січ", "лют", "бер", "кві", "тра", "чер",
  "лип", "сер", "вер", "жов", "лис", "гру",
];

export function weekdayShort(ymd: string): string {
  return WEEKDAYS_UK[fromYMD(ymd).getDay()];
}

/** «Нд, 24 лип» */
export function humanDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${WEEKDAYS_UK[d.getDay()]}, ${d.getDate()} ${MONTHS_UK[d.getMonth()]}`;
}

const WEEKDAYS_FULL_UK = [
  "Неділя", "Понеділок", "Вівторок", "Середа",
  "Четвер", "П'ятниця", "Субота",
];

/** «Неділя, 24 лип» */
export function humanDateFull(ymd: string): string {
  const d = fromYMD(ymd);
  return `${WEEKDAYS_FULL_UK[d.getDay()]}, ${d.getDate()} ${MONTHS_UK[d.getMonth()]}`;
}
