import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { kyivHourNow, todayYMD } from "@/lib/date";
import { generateDayAdvice, type AdviceMood } from "@/lib/gemini-advice";
import { AiError } from "@/lib/ai-error";
import { GOAL_LABELS, calcMacroTargets, isGoal } from "@/lib/calories";
import type { AdviceResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Звіт відкривається лише після 17:00 за Києвом — день уже фактично закритий. */
const UNLOCK_HOUR = 17;

/** mood зберігається рядком — звужуємо на читанні з БД. */
function toMood(v: string): AdviceMood {
  return v === "good" || v === "over" ? v : "mixed";
}

/**
 * GET /api/advice — звіт дня від ШІ, один раз на добу, за запитом користувача.
 *
 * Це не фонова штука: до 17:00 звіт просто недоступний ("locked"), після —
 * якщо за день є хоч один запис їжі, картка показує кнопку ("requestable") і
 * чекає, поки користувач сам натисне й попросить фідбек (`?force=1`). Щойно
 * ШІ відповів — результат назавжди кешується в DailyAdvice на цю дату:
 * кнопка зникає, показується сам текст ("ready"). Наступного дня цикл
 * починається знову.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const force = new URL(request.url).searchParams.get("force") === "1";

  const userId = auth.session.userId;
  const date = todayYMD();

  const cached = await prisma.dailyAdvice.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached) {
    return NextResponse.json({
      state: "ready",
      date,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
    } satisfies AdviceResponse);
  }

  if (kyivHourNow() < UNLOCK_HOUR) {
    return NextResponse.json({ state: "locked" } satisfies AdviceResponse);
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

  // Порожній день — єдиний випадок, коли говорити нема про що.
  if (user.meals.length === 0) {
    return NextResponse.json({ state: "no_meals" } satisfies AdviceResponse);
  }

  // Дані вже є, час настав — але поки користувач сам не тисне кнопку,
  // нічого фоном не генеруємо й не б'ємо в платний API.
  if (!force) {
    return NextResponse.json({ state: "requestable" } satisfies AdviceResponse);
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
