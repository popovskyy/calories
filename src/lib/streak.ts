import { prisma } from "@/lib/prisma";
import { shiftYMD, todayYMD } from "@/lib/date";

/**
 * Стрік = кількість підряд днів (від сьогодні або вчора) з ≥1 записом їжі.
 */
export async function computeStreak(
  userId: string,
): Promise<{ streak: number; todayLogged: boolean }> {
  const today = todayYMD();
  const from = shiftYMD(today, -120);

  const rows = await prisma.mealLog.findMany({
    where: {
      userId,
      date: { gte: from, lte: today },
      status: { not: "cancelled" },
    },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
  });

  const days = new Set(rows.map((r) => r.date));
  let streak = 0;
  let cursor = today;

  if (!days.has(today)) {
    const yesterday = shiftYMD(today, -1);
    if (!days.has(yesterday)) return { streak: 0, todayLogged: false };
    cursor = yesterday;
  }

  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftYMD(cursor, -1);
  }

  return { streak, todayLogged: days.has(today) };
}
