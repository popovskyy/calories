/**
 * Чисті правила серії — без Prisma, щоб їх можна було перевірити.
 *
 * Серія — найдорожчий актив у грі (див. STREAK_MILESTONES в economy.ts: 200
 * днів це 1500 монет, і саме заради неї купують Щити). Правила тут неочевидні
 * — старт від сьогодні АБО вчора, щит зшиває діру лише за умови, що серія
 * до неї взагалі була, — тож ламаються вони тихо, а ціна помилки максимальна.
 */

import { shiftYMD } from "@/lib/date";

/** Скільки днів назад дивимось при обчисленні серії. */
export const STREAK_LOOKBACK_DAYS = 400;

/**
 * Дні назад від сьогодні, які ще можна врятувати щитом.
 * Тиждень відсутності двома щитами не зшиєш — серія втрачена по суті.
 */
export const SHIELDABLE_LOOKBACK_DAYS = 2;

export interface DayCoverage {
  /** Дати з ≥1 записом їжі. */
  logged: ReadonlySet<string>;
  /** Дати, вже врятовані щитом. */
  shielded: ReadonlySet<string>;
}

/** День не рве серію, якщо там була їжа або витрачений щит. */
export function coversDay(cov: DayCoverage, date: string): boolean {
  return cov.logged.has(date) || cov.shielded.has(date);
}

/**
 * Серія = скільки днів підряд покрито, рахуючи від сьогодні або від вчора.
 *
 * Старт від вчора — навмисно: зранку, ще нічого не записавши, гравець не
 * повинен бачити обнулений лічильник. Але якщо порожні і сьогодні, і вчора —
 * серії немає.
 */
export function streakFrom(
  cov: DayCoverage,
  today: string,
): { streak: number; todayLogged: boolean } {
  const todayLogged = cov.logged.has(today);

  let cursor = today;
  if (!coversDay(cov, today)) {
    const yesterday = shiftYMD(today, -1);
    if (!coversDay(cov, yesterday)) return { streak: 0, todayLogged };
    cursor = yesterday;
  }

  let streak = 0;
  // Стеля потрібна, бо БД теж читається лише на STREAK_LOOKBACK_DAYS назад:
  // без неї зіпсовані дані дали б нескінченний цикл.
  while (streak < STREAK_LOOKBACK_DAYS && coversDay(cov, cursor)) {
    streak += 1;
    cursor = shiftYMD(cursor, -1);
  }

  return { streak, todayLogged };
}

/**
 * Які пропущені дні варто закрити щитами, від найдавнішого до найновішого.
 *
 * Щит витрачається лише тоді, коли він СПРАВДІ зшиває серію: якщо день перед
 * дірою теж порожній, серія обірвалась раніше і латати нічого — інакше гравець
 * платив би за щит, який нічого не рятує.
 */
export function shieldableDays(
  cov: DayCoverage,
  today: string,
  available: number,
): string[] {
  if (available <= 0) return [];

  const out: string[] = [];
  // Від найдавнішого: діра позавчора рве серію раніше за вчорашню.
  const covered = new Set(cov.shielded);
  const view: DayCoverage = { logged: cov.logged, shielded: covered };

  for (let back = SHIELDABLE_LOOKBACK_DAYS; back >= 1; back--) {
    if (out.length >= available) break;
    const date = shiftYMD(today, -back);
    if (coversDay(view, date)) continue;
    if (!coversDay(view, shiftYMD(date, -1))) continue;
    out.push(date);
    covered.add(date);
  }

  return out;
}
