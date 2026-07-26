import { prisma } from "@/lib/prisma";
import { GOAL_LABELS, isGoal } from "@/lib/calories";
import { getCosmetic } from "@/lib/cosmetics";
import { computeEvolutionStage } from "@/lib/economy";
import type { ArenaEntry } from "@/lib/types";

export type RankedEntry = Omit<ArenaEntry, "isMe">;

/**
 * Рейтинг за близькістю net (спожито − спалено) до норми.
 * Скасовані адміном записи не рахуються.
 */
export async function computeRanking(date: string): Promise<RankedEntry[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      goal: true,
      targetCalories: true,
      title: true,
      frame: true,
      maxStreak: true,
      totalInTargetDays: true,
      meals: {
        where: { date, status: { not: "cancelled" } },
        select: { calories: true },
      },
      activities: {
        where: { date, status: { not: "cancelled" } },
        select: { caloriesBurned: true },
      },
    },
  });

  const entries = users.map((u) => {
    const consumed = u.meals.reduce((s, m) => s + m.calories, 0);
    const burned = u.activities.reduce((s, a) => s + a.caloriesBurned, 0);
    const dayCalories = consumed - burned;
    const hasMeal = u.meals.length > 0;
    const hasLog = hasMeal || u.activities.length > 0;
    const difference = u.targetCalories - dayCalories;
    const goal = isGoal(u.goal) ? u.goal : "maintain";
    return {
      userId: u.id,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      goal,
      goalLabel: GOAL_LABELS[goal],
      targetCalories: u.targetCalories,
      todayCalories: dayCalories,
      difference,
      absError: Math.abs(difference),
      hasLog,
      hasMeal,
      // Статусні речі: у грі на кілька друзів саме вони — головна нагорода.
      title: u.title ? (getCosmetic("title", u.title)?.nameUk ?? null) : null,
      frame: u.frame,
      stage: computeEvolutionStage(u.totalInTargetDays, u.maxStreak),
    };
  });

  entries.sort((a, b) => {
    if (a.hasLog !== b.hasLog) return a.hasLog ? -1 : 1;
    if (a.absError !== b.absError) return a.absError - b.absError;
    return a.name.localeCompare(b.name, "uk");
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
