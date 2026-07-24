import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lastNDays, todayYMD } from "@/lib/date";
import type { DashboardDay, DashboardResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats/dashboard?userId=&date=YYYY-MM-DD (date опційно, дефолт — сьогодні) */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const end = req.nextUrl.searchParams.get("date") || todayYMD();
  if (!userId) {
    return NextResponse.json({ error: "Потрібен userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
  }

  const dates = lastNDays(end, 7);
  const meals = await prisma.mealLog.findMany({
    where: { userId, date: { in: dates } },
    select: { date: true, calories: true, protein: true, fats: true, carbs: true },
  });

  const byDate = new Map<string, { c: number; p: number; f: number; cb: number }>();
  for (const d of dates) byDate.set(d, { c: 0, p: 0, f: 0, cb: 0 });
  for (const m of meals) {
    const agg = byDate.get(m.date);
    if (!agg) continue;
    agg.c += m.calories;
    agg.p += m.protein;
    agg.f += m.fats;
    agg.cb += m.carbs;
  }

  const target = user.targetCalories;
  const days: DashboardDay[] = dates.map((date) => {
    const a = byDate.get(date)!;
    return {
      date,
      totalCalories: a.c,
      targetCalories: target,
      protein: a.p,
      fats: a.f,
      carbs: a.cb,
      status: a.c <= target ? "green" : "red",
      difference: target - a.c,
    };
  });

  const payload: DashboardResponse = {
    userId,
    days,
    today: days[days.length - 1],
  };
  return NextResponse.json(payload);
}
