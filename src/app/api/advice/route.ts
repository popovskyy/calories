import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { kyivHourNow, todayYMD } from "@/lib/date";
import { generateDayAdvice } from "@/lib/gemini-advice";
import { AiError } from "@/lib/ai-error";
import { GOAL_LABELS, calcMacroTargets, isGoal } from "@/lib/calories";
import type { AdviceMood } from "@/lib/gemini-advice";
import type { AdviceResponse } from "@/lib/types";

/** mood зберігається рядком у БД — звужуємо на читанні. */
function toMood(v: string): AdviceMood {
  return v === "good" || v === "over" ? v : "mixed";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** З якої години за Києвом день вважається «підбитим». */
const ADVICE_HOUR = 20;
/** Менше двох записів — розбирати нема чого. */
const MIN_MEALS = 2;

/**
 * GET /api/advice — вечірній розбір раціону від ШІ.
 *
 * Гейт по годині (20:00 Kyiv) стоїть на сервері, а не лише в UI: інакше
 * будь-хто міг би смикати платний ШІ-виклик хоч зранку. Результат кешується
 * в DailyAdvice — одна порада на день; перегенерація лише коли після неї
 * з'явились нові записи їжі (вечеря після поради).
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;
  const date = todayYMD();

  if (kyivHourNow() < ADVICE_HOUR) {
    return NextResponse.json({ ready: false, reason: "early" } satisfies AdviceResponse);
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

  if (user.meals.length < MIN_MEALS) {
    return NextResponse.json({ ready: false, reason: "not_enough" } satisfies AdviceResponse);
  }

  const cached = await prisma.dailyAdvice.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached && cached.mealCount >= user.meals.length) {
    return NextResponse.json({
      ready: true,
      date,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
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

    await prisma.dailyAdvice.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        headline: advice.headline,
        body: advice.body,
        tip: advice.tip,
        mood: advice.mood,
        mealCount: user.meals.length,
      },
      update: {
        headline: advice.headline,
        body: advice.body,
        tip: advice.tip,
        mood: advice.mood,
        mealCount: user.meals.length,
      },
    });

    return NextResponse.json({ ready: true, date, ...advice } satisfies AdviceResponse);
  } catch (e) {
    // ШІ лежить — віддаємо вчорашній кеш, якщо він є, інакше просто мовчимо.
    if (cached) {
      return NextResponse.json({
        ready: true,
        date,
        headline: cached.headline,
        body: cached.body,
        tip: cached.tip,
        mood: toMood(cached.mood),
      } satisfies AdviceResponse);
    }
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice]", e);
    return NextResponse.json(
      { error: "Не вдалося зібрати розбір дня" },
      { status },
    );
  }
}
