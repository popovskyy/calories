import { prisma } from "@/lib/prisma";
import { shiftYMD, todayYMD } from "@/lib/date";
import { SHIELD_ITEM_ID } from "@/lib/items";

/** Скільки днів назад дивимось при обчисленні серії. */
const LOOKBACK_DAYS = 400;

/** Дні з їжею + дні, врятовані щитом, як один набір «серія не переривалась». */
async function coveredDays(userId: string, from: string, to: string) {
  const [meals, shields] = await Promise.all([
    prisma.mealLog.findMany({
      where: { userId, date: { gte: from, lte: to }, status: { not: "cancelled" } },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.streakShield.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { date: true },
    }),
  ]);
  return {
    logged: new Set(meals.map((r) => r.date)),
    shielded: new Set(shields.map((r) => r.date)),
  };
}

/**
 * Стрік = кількість підряд днів (від сьогодні або вчора) з ≥1 записом їжі.
 * День, врятований щитом, розриву не створює.
 */
export async function computeStreak(
  userId: string,
): Promise<{ streak: number; todayLogged: boolean }> {
  const today = todayYMD();
  const from = shiftYMD(today, -LOOKBACK_DAYS);
  const { logged, shielded } = await coveredDays(userId, from, today);

  const covers = (d: string) => logged.has(d) || shielded.has(d);

  let streak = 0;
  let cursor = today;

  if (!covers(today)) {
    const yesterday = shiftYMD(today, -1);
    if (!covers(yesterday)) return { streak: 0, todayLogged: false };
    cursor = yesterday;
  }

  while (covers(cursor)) {
    streak += 1;
    cursor = shiftYMD(cursor, -1);
  }

  return { streak, todayLogged: logged.has(today) };
}

/**
 * Витрачає щити на пропущені закриті дні, щоб серія не обірвалась.
 *
 * Викликається до будь-якого показу стріку: гравець ніколи не повинен
 * побачити обнулений лічильник, маючи щит в інвентарі — інакше сенс
 * покупки втрачається, а разом із ним і головний стік економіки.
 *
 * Рятуємо лише вчора й позавчора: якщо людини не було тиждень, серія
 * все одно втрачена, і двома щитами її не зшити.
 */
export async function settleShields(userId: string): Promise<number> {
  const today = todayYMD();
  const candidates = [shiftYMD(today, -2), shiftYMD(today, -1)];

  const inv = await prisma.userItem.findUnique({
    where: { userId_itemId: { userId, itemId: SHIELD_ITEM_ID } },
    select: { qty: true },
  });
  let available = inv?.qty ?? 0;
  if (available <= 0) return 0;

  const from = shiftYMD(today, -3);
  const { logged, shielded } = await coveredDays(userId, from, today);

  let used = 0;
  // Від найдавнішого до найновішого: діра позавчора рве серію раніше.
  for (const date of candidates) {
    if (available <= 0) break;
    if (logged.has(date) || shielded.has(date)) continue;

    // Щит має сенс лише якщо він справді зшиває серію: день перед дірою
    // мусить бути покритий, інакше серії вже немає і рятувати нічого.
    const dayBefore = shiftYMD(date, -1);
    if (!logged.has(dayBefore) && !shielded.has(dayBefore)) continue;

    try {
      await prisma.$transaction([
        prisma.streakShield.create({ data: { userId, date } }),
        prisma.userItem.update({
          where: { userId_itemId: { userId, itemId: SHIELD_ITEM_ID } },
          data: { qty: { decrement: 1 } },
        }),
      ]);
      shielded.add(date);
      available -= 1;
      used += 1;
    } catch {
      // Унікальний ключ уже є — щит на цей день витрачено паралельним запитом.
    }
  }

  return used;
}

/**
 * Оновлює денормалізований рекорд серії, від якого залежить стадія маскота.
 * maxStreak тільки зростає — рекорд не має падати після зриву серії.
 */
export async function syncStreakCounters(
  userId: string,
  streak: number,
): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, maxStreak: { lt: streak } },
    data: { maxStreak: streak },
  });
}

/** Скільки днів у ±5% зафіксовано за все життя (джерело — реєстр нагород). */
export async function countInTargetDays(userId: string): Promise<number> {
  return prisma.rewardClaim.count({
    where: { userId, key: { startsWith: "in_target:" } },
  });
}
