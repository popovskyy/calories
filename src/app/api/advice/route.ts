import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  fromYMD,
  humanDate,
  kyivHourNow,
  shortDate,
  todayYMD,
  weekDays,
  weekStartYMD,
} from "@/lib/date";
import {
  generateDayAdvice,
  generateWeekAdvice,
  type AdviceMood,
  type WeekJourneyContext,
} from "@/lib/gemini-advice";
import { AiError } from "@/lib/ai-error";
import { GOAL_LABELS, calcMacroTargets, isGoal } from "@/lib/calories";
import { computeStreak } from "@/lib/streak";
import type { AdviceResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Денний звіт (Пн–Сб) відкривається після 18:00 за Києвом. */
const UNLOCK_HOUR = 18;
/** Тижневий фідбек (неділя) — після 15:00; до того — «збір інфи». */
const WEEKLY_UNLOCK_HOUR = 15;

/** mood зберігається рядком — звужуємо на читанні з БД. */
function toMood(v: string): AdviceMood {
  return v === "good" || v === "over" ? v : "mixed";
}

function isSunday(ymd: string): boolean {
  return fromYMD(ymd).getUTCDay() === 0;
}

/**
 * GET /api/advice — звіт від ШІ, один раз на період, за запитом користувача.
 *
 * Пн–Сб: денний звіт після 18:00 (DailyAdvice за сьогодні).
 * Неділя: тижневий фідбек після 15:00 (WeeklyAdvice за weekStart); денний
 * не генерується і не показується. До 15:00 — "locked" («збір інфи»).
 *
 * До unlock — "locked". Після — якщо є їжа за період: "requestable", поки
 * користувач не натисне (`?force=1`). Результат кешується.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const force = new URL(request.url).searchParams.get("force") === "1";
  const userId = auth.session.userId;
  const date = todayYMD();

  if (isSunday(date)) {
    return handleWeekly(userId, date, force);
  }
  return handleDaily(userId, date, force);
}

async function handleDaily(
  userId: string,
  date: string,
  force: boolean,
): Promise<NextResponse> {
  const cached = await prisma.dailyAdvice.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached) {
    return NextResponse.json({
      state: "ready",
      kind: "daily",
      date,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
    } satisfies AdviceResponse);
  }

  if (kyivHourNow() < UNLOCK_HOUR) {
    return NextResponse.json({
      state: "locked",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      goal: true,
      weight: true,
      targetCalories: true,
      meals: {
        where: { date, status: { not: "cancelled" } },
        orderBy: { createdAt: "asc" },
        select: {
          description: true,
          calories: true,
          protein: true,
          fats: true,
          carbs: true,
        },
      },
      activities: {
        where: { date, status: { not: "cancelled" } },
        select: { description: true, caloriesBurned: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  if (user.meals.length === 0) {
    return NextResponse.json({
      state: "no_meals",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  if (!force) {
    return NextResponse.json({
      state: "requestable",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  const totals = user.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fats: acc.fats + m.fats,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fats: 0, carbs: 0 },
  );
  const burned = user.activities.reduce((s, a) => s + a.caloriesBurned, 0);
  const goal = isGoal(user.goal) ? user.goal : "maintain";
  const macros = calcMacroTargets(user.targetCalories, user.weight);

  try {
    const advice = await generateDayAdvice({
      meals: user.meals,
      activities: user.activities,
      targetCalories: user.targetCalories,
      totals: { ...totals, calories: totals.calories - burned },
      proteinTarget: macros.protein,
      goalLabel: GOAL_LABELS[goal],
      name: user.name,
    });

    const row = {
      headline: advice.headline,
      body: advice.body,
      tip: advice.tip,
      mood: advice.mood,
      mealCount: user.meals.length,
    };
    await prisma.dailyAdvice.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...row },
      update: row,
    });

    return NextResponse.json({
      state: "ready",
      kind: "daily",
      date,
      ...advice,
    } satisfies AdviceResponse);
  } catch (e) {
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice]", e);
    return NextResponse.json(
      { error: "Не вдалося зібрати звіт дня" },
      { status },
    );
  }
}

async function handleWeekly(
  userId: string,
  today: string,
  force: boolean,
): Promise<NextResponse> {
  const weekStart = weekStartYMD(today);

  const cached = await prisma.weeklyAdvice.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (cached) {
    return NextResponse.json({
      state: "ready",
      kind: "weekly",
      date: weekStart,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
    } satisfies AdviceResponse);
  }

  if (kyivHourNow() < WEEKLY_UNLOCK_HOUR) {
    return NextResponse.json({
      state: "locked",
      kind: "weekly",
    } satisfies AdviceResponse);
  }

  const days = weekDays(weekStart).filter((d) => d <= today);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      goal: true,
      weight: true,
      targetCalories: true,
      startWeight: true,
      targetWeight: true,
      startWeightDate: true,
      maxStreak: true,
      totalInTargetDays: true,
      meals: {
        where: { date: { in: days }, status: { not: "cancelled" } },
        orderBy: { createdAt: "asc" },
        select: {
          date: true,
          description: true,
          calories: true,
          protein: true,
          fats: true,
          carbs: true,
        },
      },
      activities: {
        where: { date: { in: days }, status: { not: "cancelled" } },
        select: { date: true, caloriesBurned: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  if (user.meals.length === 0) {
    return NextResponse.json({
      state: "no_meals",
      kind: "weekly",
    } satisfies AdviceResponse);
  }

  if (!force) {
    return NextResponse.json({
      state: "requestable",
      kind: "weekly",
    } satisfies AdviceResponse);
  }

  const [{ streak }, loggedDayGroups, recentWeights, priorRows] =
    await Promise.all([
      computeStreak(userId),
      prisma.mealLog.groupBy({
        by: ["date"],
        where: { userId, status: { not: "cancelled" } },
      }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 6,
        select: { date: true, weight: true },
      }),
      prisma.weeklyAdvice.findMany({
        where: { userId, weekStart: { lt: weekStart } },
        orderBy: { weekStart: "desc" },
        take: 3,
        select: {
          weekStart: true,
          headline: true,
          mood: true,
          tip: true,
        },
      }),
    ]);

  const journey: WeekJourneyContext = {
    currentWeight: user.weight,
    startWeight: user.startWeight,
    targetWeight: user.targetWeight,
    startWeightDate: user.startWeightDate,
    streak,
    maxStreak: user.maxStreak,
    inTargetDays: user.totalInTargetDays,
    daysLoggedTotal: loggedDayGroups.length,
    recentWeights,
    priorWeeks: priorRows.map((p) => ({
      weekStart: p.weekStart,
      headline: p.headline,
      mood: toMood(p.mood),
      tip: p.tip,
    })),
  };

  const byDay = new Map<
    string,
    {
      calories: number;
      protein: number;
      fats: number;
      carbs: number;
      mealsCount: number;
      burned: number;
      mealHints: string[];
    }
  >();
  for (const d of days) {
    byDay.set(d, {
      calories: 0,
      protein: 0,
      fats: 0,
      carbs: 0,
      mealsCount: 0,
      burned: 0,
      mealHints: [],
    });
  }
  for (const m of user.meals) {
    const row = byDay.get(m.date);
    if (!row) continue;
    row.calories += m.calories;
    row.protein += m.protein;
    row.fats += m.fats;
    row.carbs += m.carbs;
    row.mealsCount += 1;
    if (row.mealHints.length < 4) row.mealHints.push(m.description);
  }
  for (const a of user.activities) {
    const row = byDay.get(a.date);
    if (!row) continue;
    row.burned += a.caloriesBurned;
  }

  const goal = isGoal(user.goal) ? user.goal : "maintain";
  const macros = calcMacroTargets(user.targetCalories, user.weight);
  const weekEnd = days[days.length - 1] ?? today;
  const weekLabel = `${shortDate(weekStart)} – ${shortDate(weekEnd)}`;

  try {
    const advice = await generateWeekAdvice({
      days: days.map((d) => {
        const row = byDay.get(d)!;
        return {
          date: d,
          label: humanDate(d),
          calories: row.calories - row.burned,
          protein: Math.round(row.protein),
          fats: Math.round(row.fats),
          carbs: Math.round(row.carbs),
          mealsCount: row.mealsCount,
          burned: row.burned,
          mealHints: row.mealHints,
        };
      }),
      targetCalories: user.targetCalories,
      proteinTarget: macros.protein,
      goalLabel: GOAL_LABELS[goal],
      name: user.name,
      weekLabel,
      journey,
    });

    const row = {
      headline: advice.headline,
      body: advice.body,
      tip: advice.tip,
      mood: advice.mood,
      mealCount: user.meals.length,
    };
    await prisma.weeklyAdvice.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...row },
      update: row,
    });

    return NextResponse.json({
      state: "ready",
      kind: "weekly",
      date: weekStart,
      ...advice,
    } satisfies AdviceResponse);
  } catch (e) {
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice:week]", e);
    return NextResponse.json(
      { error: "Не вдалося зібрати тижневий фідбек" },
      { status },
    );
  }
}
