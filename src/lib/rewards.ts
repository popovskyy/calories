import { prisma } from "@/lib/prisma";
import { currentMonthKey, kyivHourNow, shiftYMD, todayYMD } from "@/lib/date";
import { dayNetCalories, type DayTotals } from "@/lib/day-totals";
import { computeStreak } from "@/lib/streak";
import { computeRanking } from "@/lib/arena";
import { isInTarget, settleRecentQuests } from "@/lib/quests";
import { grant, type GrantedReward } from "@/lib/reward-grant";

export type { GrantedReward };

/**
 * Жорстка економіка: дрібні денні монети, великі — за квести тижня.
 *
 * Ключове правило: точність (±5%) оцінюється ЛИШЕ за закритим днем.
 * Інакше можна було б «пройти крізь» ціль о 15:00, забрати монети,
 * а потім доїсти ще 1500 ккал — нагорода вже нарахована назавжди.
 */
const STREAK_THRESHOLDS = [
  { n: 3, coins: 15 },
  { n: 7, coins: 35 },
  { n: 14, coins: 70 },
];
const ARENA_PRIZES = [50, 30, 20];
const DAILY_LOG_COINS = 5;
const IN_TARGET_COINS = 15;
const ARENA_SETTLE_HOUR = 4;
/** Скільки закритих днів добиваємо назад (якщо юзер не заходив у застосунок). */
const SETTLE_LOOKBACK_DAYS = 3;
/** Приз арени лише тим, хто реально близько до своєї норми. */
const ARENA_MAX_ERROR = 0.15;

/** Дні, які вже не можуть змінитись «доїданням»: усе, крім сьогодні. */
function closedDays(today: string, extra?: string): string[] {
  const set = new Set<string>();
  for (let i = 1; i <= SETTLE_LOOKBACK_DAYS; i++) set.add(shiftYMD(today, -i));
  if (extra && extra < today) set.add(extra);
  return [...set].sort();
}

/** Нараховує лог + точність за фінальними цифрами закритого дня. */
async function settleClosedDay(
  userId: string,
  date: string,
  totals: DayTotals,
  targetCalories: number,
  out: GrantedReward[],
): Promise<void> {
  if (totals.mealCount === 0) return;

  await grant(userId, `daily_log:${date}`, DAILY_LOG_COINS, "Запис їжі", out);

  if (isInTarget(totals.net, targetCalories)) {
    await grant(userId, `in_target:${date}`, IN_TARGET_COINS, "День у цілі ±5%", out);
  }
}

export async function evaluateMealRewards(
  userId: string,
  date: string,
): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  const today = todayYMD();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetCalories: true },
  });
  const target = user?.targetCalories ?? 0;

  // Сьогодні — лише дрібна монета за сам факт запису.
  const totals = await dayNetCalories(userId, today);
  if (totals.mealCount > 0) {
    await grant(userId, `daily_log:${today}`, DAILY_LOG_COINS, "Перший запис їжі", out);
  }

  // Читання паралельно, нарахування послідовно — щоб не битись за рядок user.coins.
  const pending = closedDays(today, date);
  const pendingTotals = await Promise.all(
    pending.map((d) => dayNetCalories(userId, d)),
  );
  for (const [i, d] of pending.entries()) {
    await settleClosedDay(userId, d, pendingTotals[i]!, target, out);
  }

  const { streak } = await computeStreak(userId);
  const month = currentMonthKey();
  for (const t of STREAK_THRESHOLDS) {
    if (streak >= t.n) {
      await grant(
        userId,
        `streak:${t.n}:${month}`,
        t.coins,
        `Стрік ${t.n} днів`,
        out,
      );
    }
  }

  out.push(...(await settleRecentQuests(userId)));
  return out;
}

/**
 * Скільки місць реально оплачується. У грі на 1–2 людини «топ-3» — це
 * безкоштовні монети всім учасникам, тому призових місць завжди вдвічі
 * менше за поле: 2–3 гравці → 1 приз, 4–5 → 2, 6+ → 3.
 */
function paidSlots(fieldSize: number): number {
  return Math.min(ARENA_PRIZES.length, Math.floor(fieldSize / 2));
}

async function settleArenaDay(
  userId: string,
  date: string,
  out: GrantedReward[],
): Promise<void> {
  const ranking = await computeRanking(date);
  // Поле = ті, хто справді вів журнал їжі того дня.
  const field = ranking.filter((e) => e.hasMeal);
  const slots = paidSlots(field.length);
  const idx = field.findIndex((e) => e.userId === userId);
  const me = idx >= 0 ? field[idx]! : null;

  const accurate =
    !!me && me.targetCalories > 0 && me.absError <= me.targetCalories * ARENA_MAX_ERROR;
  const coins = accurate && idx < slots ? ARENA_PRIZES[idx]! : 0;

  await grant(
    userId,
    `arena:${date}`,
    coins,
    coins > 0 ? `Арена ${date}: ${idx + 1} місце` : `Арена ${date}`,
    out,
  );
}

export async function syncArenaRewards(userId: string): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  if (kyivHourNow() < ARENA_SETTLE_HOUR) return out;

  // computeRanking сканує всіх юзерів, тож спершу одним запитом відсіюємо
  // вже закриті дні — у типовому виклику лишається нуль днів для підрахунку.
  const days = closedDays(todayYMD());
  const settled = await prisma.rewardClaim.findMany({
    where: { userId, key: { in: days.map((d) => `arena:${d}`) } },
    select: { key: true },
  });
  const done = new Set(settled.map((c) => c.key));

  for (const date of days) {
    if (done.has(`arena:${date}`)) continue;
    await settleArenaDay(userId, date, out);
  }
  return out;
}
