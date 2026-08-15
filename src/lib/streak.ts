import { prisma } from "@/lib/prisma";
import { shiftYMD, todayYMD } from "@/lib/date";
import { STREAK_LOOKBACK_DAYS, streakFrom } from "@/lib/streak-core";

/** Стрік = підряд дні з ≥1 записом їжі. Пропуск дня обнуляє. */
export async function computeStreak(
  userId: string,
): Promise<{ streak: number; todayLogged: boolean }> {
  const today = todayYMD();
  const from = shiftYMD(today, -STREAK_LOOKBACK_DAYS);
  const meals = await prisma.mealLog.findMany({
    where: {
      userId,
      date: { gte: from, lte: today },
      status: { not: "cancelled" },
    },
    select: { date: true },
    distinct: ["date"],
  });
  return streakFrom(
    {
      logged: new Set(meals.map((r) => r.date)),
      shielded: new Set(),
    },
    today,
  );
}
