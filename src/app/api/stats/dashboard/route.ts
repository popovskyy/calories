import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastNDays, todayYMD } from "@/lib/date";
import type { DashboardDay, DashboardResponse } from "@/lib/types";

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

  const dates = lastNDays(end, 7);
  const [meals, activities] = await Promise.all([
    prisma.mealLog.findMany({
      where: { userId, date: { in: dates }, status: { not: "cancelled" } },
      select: { date: true, calories: true, protein: true, fats: true, carbs: true },
    }),
    prisma.activityLog.findMany({
      where: { userId, date: { in: dates }, status: { not: "cancelled" } },
      select: { date: true, caloriesBurned: true },
    }),
  ]);

  const byDate = new Map<
    string,
    { c: number; burned: number; p: number; f: number; cb: number }
  >();
  for (const d of dates) byDate.set(d, { c: 0, burned: 0, p: 0, f: 0, cb: 0 });
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

  const target = user.targetCalories;
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
      status: net <= target ? "green" : "red",
      difference: target - net,
    };
  });

  const payload: DashboardResponse = {
    userId,
    days,
    today: days[days.length - 1],
  };
  return NextResponse.json(payload);
}
