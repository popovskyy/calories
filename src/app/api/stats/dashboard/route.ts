import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayYMD, weekDays, weekStartYMD } from "@/lib/date";
import {
  calcMaintenanceCalories,
  isGoal,
  isSex,
} from "@/lib/calories";
import type { DashboardDay, DashboardResponse, DayStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats/dashboard?date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;
  const end = req.nextUrl.searchParams.get("date") || todayYMD();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
  }

  // Календарний тиждень Пн→end (не rolling «останні 7 днів»).
  const weekDates = weekDays(weekStartYMD(end)).filter((d) => d <= end);

  const [meals, activities] = await Promise.all([
    prisma.mealLog.findMany({
      where: { userId, date: { in: weekDates }, status: { not: "cancelled" } },
      select: { date: true, calories: true, protein: true, fats: true, carbs: true },
    }),
    prisma.activityLog.findMany({
      where: { userId, date: { in: weekDates }, status: { not: "cancelled" } },
      select: { date: true, caloriesBurned: true },
    }),
  ]);

  const byDate = new Map<
    string,
    { c: number; burned: number; p: number; f: number; cb: number }
  >();
  for (const d of weekDates) byDate.set(d, { c: 0, burned: 0, p: 0, f: 0, cb: 0 });
  for (const m of meals) {
    const agg = byDate.get(m.date);
    if (!agg) continue;
    agg.c += m.calories;
    agg.p += m.protein;
    agg.f += m.fats;
    agg.cb += m.carbs;
  }
  for (const a of activities) {
    const agg = byDate.get(a.date);
    if (!agg) continue;
    agg.burned += a.caloriesBurned;
  }

  // Обрізати порожні дні на початку (до першого дня з їжею).
  const firstLoggedIdx = weekDates.findIndex((d) => (byDate.get(d)?.c ?? 0) > 0);
  const dates =
    firstLoggedIdx > 0 ? weekDates.slice(firstLoggedIdx) : weekDates;

  const target = user.targetCalories;
  const goal = isGoal(user.goal) ? user.goal : "maintain";
  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: isSex(user.sex) ? user.sex : "male",
    weightKg: user.weight,
    heightCm: user.height,
  });

  const days: DashboardDay[] = dates.map((date) => {
    const a = byDate.get(date)!;
    const net = a.c - a.burned;
    return {
      date,
      totalCalories: net,
      consumedCalories: a.c,
      burnedCalories: a.burned,
      targetCalories: target,
      protein: a.p,
      fats: a.f,
      carbs: a.cb,
      status: dayBarStatus(net, target, maintenance, goal),
      difference: target - net,
    };
  });

  // Завжди повертаємо рядок за `end` (навіть якщо графік обрізав leading empty).
  const endAgg = byDate.get(end) ?? { c: 0, burned: 0, p: 0, f: 0, cb: 0 };
  const endNet = endAgg.c - endAgg.burned;
  const todayRow: DashboardDay = days.find((d) => d.date === end) ?? {
    date: end,
    totalCalories: endNet,
    consumedCalories: endAgg.c,
    burnedCalories: endAgg.burned,
    targetCalories: target,
    protein: endAgg.p,
    fats: endAgg.f,
    carbs: endAgg.cb,
    status: dayBarStatus(endNet, target, maintenance, goal),
    difference: target - endNet,
  };

  const payload: DashboardResponse = {
    userId,
    days,
    today: todayRow,
  };
  return NextResponse.json(payload);
}

/**
 * green — у цілі або під нею;
 * amber — на дефіциті над ціллю, але ще під підтримкою (м'який дефіцит);
 * red — профіцит над підтримкою (або над ціллю на maintain).
 */
function dayBarStatus(
  net: number,
  target: number,
  maintenance: number,
  goal: "maintain" | "deficit",
): DayStatus {
  if (net <= target) return "green";
  if (goal === "deficit" && net <= maintenance) return "amber";
  return "red";
}
