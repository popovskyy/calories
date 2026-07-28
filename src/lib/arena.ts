import { prisma } from "@/lib/prisma";
import { GOAL_LABELS, isGoal, type Goal } from "@/lib/calories";
import { getCosmetic } from "@/lib/cosmetics";
import { computeEvolutionStage, inTargetBand } from "@/lib/economy";
import type { ArenaEntry } from "@/lib/types";

export type RankedEntry = Omit<ArenaEntry, "isMe">;

/**
 * Очки дня (0–100) — рейтинг арени.
 *
 * Голий |net − ціль| вироджувався в «хто більше наїв, той вищий», а ще карав
 * недобір нарівні з перебором. Формула чинить інакше:
 *  • день у зоні цілі (асиметричній!) — повні 70 базових;
 *  • недобір нижче зони тане пропорційно з'їденому — щоб голодування не
 *    виглядало перемогою;
 *  • перебір тане втричі швидше: саме він ламає ціль;
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
  goal: Goal;
}): number {
  if (e.targetCalories <= 0) return 0;

  /*
   * Точність рахуємо від АСИМЕТРИЧНОЇ зони цілі, а не від самого числа норми:
   * недобір у межах зони — не помилка (на дефіциті це навіть по дорозі до
   * мети), тож він дає повний бал. Нижче зони бал падає пропорційно з'їденому
   * — голодування не має виглядати перемогою. Вище зони падає втричі швидше:
   * саме перебір ламає ціль.
   */
  const band = inTargetBand(e.targetCalories, e.goal);
  const acc =
    e.dayCalories >= band.min && e.dayCalories <= band.max
      ? 1
      : e.dayCalories < band.min
        ? Math.max(0, e.dayCalories / band.min)
        : Math.max(0, 1 - 3 * ((e.dayCalories - band.max) / e.targetCalories));
  let score = 70 * acc;
  if (e.mealsCount >= 2) score += 10;
  if (e.mealsCount >= 3) score += 5;
  if (e.activitiesCount > 0) score += 10;
  if (e.dayCalories > 0 && e.absError <= e.targetCalories * 0.05) score += 5;
  return Math.round(score);
}

/**
 * Рейтинг за очками дня; призовий гейт на закритті живе в rewards.ts.
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
        select: { calories: true, protein: true, fats: true, carbs: true },
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
      goal,
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
      protein: Math.round(u.meals.reduce((s, m) => s + m.protein, 0)),
      fats: Math.round(u.meals.reduce((s, m) => s + m.fats, 0)),
      carbs: Math.round(u.meals.reduce((s, m) => s + m.carbs, 0)),
      mealsCount: u.meals.length,
      maxStreak: u.maxStreak,
      inTargetDays: u.totalInTargetDays,
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
