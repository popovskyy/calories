/** Хелпери дат YYYY-MM-DD у часовій зоні Europe/Kyiv (не UTC сервера). */

const TZ = "Europe/Kyiv";

function partsInTz(d: Date, timeZone = TZ) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  };
}

export function toYMD(d: Date): string {
  const { year, month, day } = partsInTz(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

/** Поточний місяць YYYY-MM (Kyiv) — для періодичних стрік-нагород. */
export function currentMonthKey(): string {
  const { year, month } = partsInTz(new Date());
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Година 0–23 у Kyiv. */
export function kyivHourNow(): number {
  return partsInTz(new Date()).hour;
}

/** Година 0–23 у Kyiv для довільного моменту (createdAt записів — у UTC). */
export function kyivHourOf(d: Date): number {
  return partsInTz(d).hour;
}

/** Хвилини від опівночі за київським часом — для карток «до 12:00». */
export function kyivMinutesOf(d: Date): number {
  const { hour, minute } = partsInTz(d);
  return hour * 60 + minute;
}

/** Дата зі зсувом на N днів від base (календарно). */
export function shiftYMD(ymd: string, deltaDays: number): string {
  const d = fromYMD(ymd);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Парсить YMD як UTC-північ (стабільні зсуви без DST-сюрпризів). */
export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
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
  return WEEKDAYS_UK[fromYMD(ymd).getUTCDay()];
}

/** «24 лип» — компактний підпис для осей графіків. */
export function shortDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${d.getUTCDate()} ${MONTHS_UK[d.getUTCMonth()]}`;
}

/** «Нд, 24 лип» */
export function humanDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${WEEKDAYS_UK[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_UK[d.getUTCMonth()]}`;
}

const WEEKDAYS_FULL_UK = [
  "Неділя", "Понеділок", "Вівторок", "Середа",
  "Четвер", "П'ятниця", "Субота",
];

/** «Неділя, 24 лип» */
export function humanDateFull(ymd: string): string {
  const d = fromYMD(ymd);
  return `${WEEKDAYS_FULL_UK[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_UK[d.getUTCMonth()]}`;
}

/** Понеділок тижня (Kyiv-календар), YYYY-MM-DD. Тиждень: Пн–Нд. */
export function weekStartYMD(ymd: string = todayYMD()): string {
  const dow = fromYMD(ymd).getUTCDay(); // 0=Нд … 6=Сб
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  return shiftYMD(ymd, -daysFromMon);
}

/** 7 дат тижня від понеділка. */
export function weekDays(weekStart: string): string[] {
  return lastNDays(shiftYMD(weekStart, 6), 7);
}

/** Номер тижня від epoch (для ротації квестів). */
export function weekIndex(weekStart: string): number {
  return Math.floor(fromYMD(weekStart).getTime() / (7 * 24 * 60 * 60 * 1000));
}
