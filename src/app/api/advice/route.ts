import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { kyivHourNow, todayYMD } from "@/lib/date";
import {
  dayPartOfHour,
  generateDayAdvice,
  type AdviceMood,
  type DayPart,
} from "@/lib/gemini-advice";
import { AiError } from "@/lib/ai-error";
import { GOAL_LABELS, calcMacroTargets, isGoal } from "@/lib/calories";
import type { AdviceResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** mood/dayPart зберігаються рядками — звужуємо на читанні з БД. */
function toMood(v: string): AdviceMood {
  return v === "good" || v === "over" ? v : "mixed";
}
function toPart(v: string): DayPart {
  return v === "morning" || v === "day" ? v : "evening";
}

/**
 * GET /api/advice — розбір раціону від ШІ, актуальний на момент відкриття.
 *
 * Порада живе весь день і змінюється разом із ним: зранку коментує сніданок,
 * увечері підбиває підсумок. Щоб не бити в платний API на кожне відкриття
 * Огляду, результат кешується в DailyAdvice і перегенеровується лише коли
 * змінилось те, що впливає на текст, — кількість записів або частина доби.
 * `?force=1` (кнопка «Оновити» в картці) ігнорує кеш і генерує наново.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const force = new URL(request.url).searchParams.get("force") === "1";

  const userId = auth.session.userId;
  const date = todayYMD();
  const dayPart = dayPartOfHour(kyivHourNow());

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

  // Порожній день — єдиний випадок, коли говорити нема про що.
  if (user.meals.length === 0) {
    return NextResponse.json({ ready: false, reason: "no_meals" } satisfies AdviceResponse);
  }

  const cached = await prisma.dailyAdvice.findUnique({
    where: { userId_date: { userId, date } },
  });
  const fresh =
    cached && cached.mealCount === user.meals.length && cached.dayPart === dayPart;
  if (cached && fresh && !force) {
    return NextResponse.json({
      ready: true,
      date,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
      dayPart: toPart(cached.dayPart),
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
      dayPart,
    });

    const row = {
      headline: advice.headline,
      body: advice.body,
      tip: advice.tip,
      mood: advice.mood,
      mealCount: user.meals.length,
      dayPart,
    };
    await prisma.dailyAdvice.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...row },
      update: row,
    });

    return NextResponse.json({
      ready: true,
      date,
      ...advice,
      dayPart,
    } satisfies AdviceResponse);
  } catch (e) {
    // ШІ лежить — краще показати трохи застарілий розбір, ніж порожнечу.
    if (cached) {
      return NextResponse.json({
        ready: true,
        date,
        headline: cached.headline,
        body: cached.body,
        tip: cached.tip,
        mood: toMood(cached.mood),
        dayPart: toPart(cached.dayPart),
      } satisfies AdviceResponse);
    }
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice]", e);
    return NextResponse.json(
      { error: "Не вдалося зібрати розбір раціону" },
      { status },
    );
  }
}
