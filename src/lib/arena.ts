import { prisma } from "@/lib/prisma";
import { GOAL_LABELS, isGoal } from "@/lib/calories";
import { getCosmetic } from "@/lib/cosmetics";
import { computeEvolutionStage } from "@/lib/economy";
import type { ArenaEntry } from "@/lib/types";

export type RankedEntry = Omit<ArenaEntry, "isMe">;

/**
 * Очки дня (0–100) — рейтинг арени.
 *
 * Голий |net − ціль| протягом дня вироджувався в «хто більше наїв до норми,
 * той вищий»: перебір на +100 обганяв чесні 60% норми. Формула чинить інакше:
 *  • до норми очки ростуть з прогресом (0…70 за наближення до цілі);
 *  • перебір тане вдвічі швидше, ніж ріс недобір: +10% над нормою ≈ 80% норми,
 *    +50% — нуль базових очок;
 *  • бонуси за чесне ведення журналу, а не за «влучання числа»:
 *    2+ прийоми їжі +10, 3+ ще +5, активність +10, снайперське ±5% +5.
 * Один «магічний» запис рівно в норму більше не виграє в реального журналу.
 */
export function dayScore(e: {
  targetCalories: number;
  dayCalories: number;
  mealsCount: number;
  activitiesCount: number;
  absError: number;
}): number {
  if (e.targetCalories <= 0) return 0;
  const ratio = e.dayCalories / e.targetCalories;
  const acc =
    ratio <= 1 ? Math.max(0, ratio) : Math.max(0, 1 - 2 * (ratio - 1));
  let score = 70 * acc;
  if (e.mealsCount >= 2) score += 10;
  if (e.mealsCount >= 3) score += 5;
  if (e.activitiesCount > 0) score += 10;
  if (e.dayCalories > 0 && e.absError <= e.targetCalories * 0.05) score += 5;
  return Math.round(score);
}

/**
 * Рейтинг за очками дня; призовий гейт (±15% на закритті) живе в rewards.ts.
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
    const score = dayScore({
      targetCalories: u.targetCalories,
      dayCalories,
      mealsCount: u.meals.length,
      activitiesCount: u.activities.length,
      absError: Math.abs(difference),
    });
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
      score,
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
    if (a.score !== b.score) return b.score - a.score;
    if (a.absError !== b.absError) return a.absError - b.absError;
    return a.name.localeCompare(b.name, "uk");
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
