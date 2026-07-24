import { prisma } from "@/lib/prisma";
import { currentMonthKey, kyivHourNow, shiftYMD, todayYMD } from "@/lib/date";
import { dayNetCalories } from "@/lib/day-totals";
import { computeStreak } from "@/lib/streak";
import { computeRanking } from "@/lib/arena";
import { QUEST_TARGET_TOLERANCE, settleRecentQuests } from "@/lib/quests";
import { grant, type GrantedReward } from "@/lib/reward-grant";

export type { GrantedReward };

/**
 * Жорстка економіка: дрібні денні монети, великі — за квести тижня.
 * in_target лише з їжею в журналі і вузьким ±5%.
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

export async function evaluateMealRewards(
  userId: string,
  date: string,
): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  const today = todayYMD();
  if (date !== today) {
    return settleRecentQuests(userId);
  }

  const totals = await dayNetCalories(userId, today);
  if (totals.mealCount > 0) {
    await grant(userId, `daily_log:${today}`, DAILY_LOG_COINS, "Перший запис їжі", out);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetCalories: true },
    });
    if (user && user.targetCalories > 0) {
      const tol = user.targetCalories * QUEST_TARGET_TOLERANCE;
      if (Math.abs(totals.net - user.targetCalories) <= tol) {
        await grant(
          userId,
          `in_target:${today}`,
          IN_TARGET_COINS,
          "День у вузькій цілі ±5%",
          out,
        );
      }
    }
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

export async function syncArenaRewards(userId: string): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  if (kyivHourNow() < ARENA_SETTLE_HOUR) return out;

  const yesterday = shiftYMD(todayYMD(), -1);
  const key = `arena:${yesterday}`;

  const existing = await prisma.rewardClaim.findUnique({
    where: { userId_key: { userId, key } },
  });
  if (existing) return out;

  const ranking = await computeRanking(yesterday);
  const idx = ranking.findIndex((e) => e.userId === userId && e.hasLog);
  const coins = idx >= 0 && idx < ARENA_PRIZES.length ? ARENA_PRIZES[idx]! : 0;

  await grant(
    userId,
    key,
    coins,
    coins > 0 ? `Арена вчора: ${idx + 1} місце` : "Арена вчора",
    out,
  );
  return out;
}
