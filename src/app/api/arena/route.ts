import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayYMD } from "@/lib/date";
import { GOAL_LABELS, isGoal } from "@/lib/calories";
import type { ArenaEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Публічний рейтинг (лише для залогінених):
 * усі користувачі + сьогоднішні калорії / ціль / дефіцит.
 * Сортування: кращий дефіцит (більше залишку під ціллю) вище;
 * хто перебрав — нижче; без записів сьогодні — в кінці.
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const today = todayYMD();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      goal: true,
      targetCalories: true,
      meals: {
        where: { date: today },
        select: { calories: true },
      },
    },
  });

  const entries = users.map((u) => {
    const todayCalories = u.meals.reduce((s, m) => s + m.calories, 0);
    const hasLog = u.meals.length > 0;
    const difference = u.targetCalories - todayCalories;
    const goal = isGoal(u.goal) ? u.goal : "maintain";
    return {
      userId: u.id,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      goal,
      goalLabel: GOAL_LABELS[goal],
      targetCalories: u.targetCalories,
      todayCalories,
      difference,
      hasLog,
      isMe: u.id === auth.session.userId,
    };
  });

  entries.sort((a, b) => {
    if (a.hasLog !== b.hasLog) return a.hasLog ? -1 : 1;
    if (a.difference >= 0 && b.difference < 0) return -1;
    if (a.difference < 0 && b.difference >= 0) return 1;
    return b.difference - a.difference;
  });

  const ranked: ArenaEntry[] = entries.map((e, i) => ({ ...e, rank: i + 1 }));

  return NextResponse.json({
    date: today,
    entries: ranked,
  });
}
