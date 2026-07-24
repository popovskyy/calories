import { prisma } from "@/lib/prisma";

export type EntryStatus = "approved" | "cancelled";

export function isApproved(status: string): boolean {
  return status !== "cancelled";
}

export interface DayTotals {
  consumed: number;
  burned: number;
  net: number;
  protein: number;
  fats: number;
  carbs: number;
  mealCount: number;
  activityCount: number;
}

/** Підсумок дня: спожито − спалено (лише approved). */
export async function dayNetCalories(
  userId: string,
  date: string,
): Promise<DayTotals> {
  const [meals, activities] = await Promise.all([
    prisma.mealLog.findMany({
      where: { userId, date, status: { not: "cancelled" } },
      select: { calories: true, protein: true, fats: true, carbs: true },
    }),
    prisma.activityLog.findMany({
      where: { userId, date, status: { not: "cancelled" } },
      select: { caloriesBurned: true },
    }),
  ]);

  const consumed = meals.reduce((s, m) => s + m.calories, 0);
  const burned = activities.reduce((s, a) => s + a.caloriesBurned, 0);
  return {
    consumed,
    burned,
    net: consumed - burned,
    protein: meals.reduce((s, m) => s + m.protein, 0),
    fats: meals.reduce((s, m) => s + m.fats, 0),
    carbs: meals.reduce((s, m) => s + m.carbs, 0),
    mealCount: meals.length,
    activityCount: activities.length,
  };
}
