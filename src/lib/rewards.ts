import { prisma } from "@/lib/prisma";
import { kyivHourNow, shiftYMD, todayYMD } from "@/lib/date";
import { dayNetCalories, type DayTotals } from "@/lib/day-totals";
import {
  computeStreak,
  countInTargetDays,
  settleShields,
  syncStreakCounters,
} from "@/lib/streak";
import { computeRanking } from "@/lib/arena";
import { isInTarget, settleRecentQuests } from "@/lib/quests";
import { isGoal, type Goal } from "@/lib/calories";
import { settleDailyCards } from "@/lib/daily-cards";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import {
  isArenaPayable,
  ARENA_PRIZES,
  ARENA_SETTLE_HOUR,
  DAILY_LOG_COINS,
  IN_TARGET_COINS,
  SETTLE_LOOKBACK_DAYS,
  STREAK_DIVIDEND_COINS,
  STREAK_MILESTONES,
} from "@/lib/economy";
import { toPresetUrl } from "@/lib/avatar-presets";

export type { GrantedReward };

/**
 * Жорстка економіка: дрібні денні монети, великі — за квести тижня.
 *
 * Ключове правило: точність (±5%) оцінюється ЛИШЕ за закритим днем.
 * Інакше можна було б «пройти крізь» ціль о 15:00, забрати монети,
 * а потім доїсти ще 1500 ккал — нагорода вже нарахована назавжди.
 *
 * Усі числа живуть у lib/economy.ts — балансувати треба в одному місці.
 */

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
  goal: Goal,
  out: GrantedReward[],
): Promise<void> {
  if (totals.mealCount === 0) return;

  await grant(userId, `daily_log:${date}`, DAILY_LOG_COINS, "Запис їжі", out);

  const isNormal = isInTarget(totals.net, targetCalories, goal);
  if (isNormal) {
    await grant(userId, `in_target:${date}`, IN_TARGET_COINS, "День у цілі", out);
  }

  // Peppa punishment:
  // - if user OVERs (net > target) on a closed day -> next day they get `pepa_pig`
  // - if punishment is active AND that closed day was in-target -> revert to backup on following day
  const isOver = totals.net > targetCalories;
  if (!isOver && !isNormal) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      peppaPunishBackupAvatarUrl: true,
    },
  });
  if (!user) return;

  const peppaActive = user.peppaPunishBackupAvatarUrl != null;

  if (peppaActive && isNormal) {
    // Only revert when the closed day is "in target" AND punishment is already active.
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: user.peppaPunishBackupAvatarUrl,
        peppaPunishBackupAvatarUrl: null,
      },
    });
  } else if (isOver) {
    // Apply punishment for next day.
    // Do not overwrite backup if user is already in punishment.
    const nextBackup =
      user.peppaPunishBackupAvatarUrl == null
        ? user.avatarUrl
        : user.peppaPunishBackupAvatarUrl;

    await prisma.user.update({
      where: { id: userId },
      data: {
        peppaPunishBackupAvatarUrl: nextBackup,
        avatarUrl: toPresetUrl("pepa_pig"),
      },
    });
  }
}

export async function evaluateMealRewards(
  userId: string,
  date: string,
): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  const today = todayYMD();

  // Щит має спрацювати ДО того, як гравець побачить обнулений стрік.
  await settleShields(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetCalories: true, goal: true },
  });
  const target = user?.targetCalories ?? 0;
  const goal: Goal = isGoal(user?.goal ?? "") ? (user!.goal as Goal) : "maintain";

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
    await settleClosedDay(userId, d, pendingTotals[i]!, target, goal, out);
  }

  await settleStreakRewards(userId, out);

  out.push(...(await settleDailyCards(userId)));
  out.push(...(await settleRecentQuests(userId)));
  return out;
}

/**
 * Віхи стріку (одноразово за все життя) + повторюваний дивіденд за кожен
 * повний тиждень серії.
 *
 * Ключ віхи навмисно без місяця: раніше `streak:14:2026-07` дозволяв щомісяця
 * заново отримувати ті самі 70 монет, і при цьому серія на 200 днів не давала
 * нічого понад 14-денну. Тепер віха платиться раз, зате великі числа реально
 * дорогі, а безперервність підтримується дивідендом.
 */
async function settleStreakRewards(
  userId: string,
  out: GrantedReward[],
): Promise<void> {
  const { streak } = await computeStreak(userId);
  if (streak <= 0) return;

  for (const m of STREAK_MILESTONES) {
    if (streak >= m.n) {
      await grant(userId, `streak:${m.n}`, m.coins, `Віха: стрік ${m.n} днів`, out);
    }
  }

  // Дивіденд за кожен повний тиждень: ключ по номеру тижня, тож повторний
  // виклик у межах того самого тижня серії нічого не додасть.
  const weeks = Math.floor(streak / 7);
  for (let w = 1; w <= weeks; w++) {
    await grant(
      userId,
      `streak_div:${w}`,
      STREAK_DIVIDEND_COINS,
      `Дивіденд серії: ${w * 7} днів`,
      out,
    );
  }

  await syncStreakCounters(userId, streak);

  // totalInTargetDays денормалізований заради арени (там і так важкий запит
  // по всіх гравцях) — тримаємо його в синхроні з реєстром нагород.
  const inTarget = await countInTargetDays(userId);
  await prisma.user.updateMany({
    where: { id: userId, totalInTargetDays: { not: inTarget } },
    data: { totalInTargetDays: inTarget },
  });
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

  const accurate = !!me && isArenaPayable(me.todayCalories, me.targetCalories);
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
