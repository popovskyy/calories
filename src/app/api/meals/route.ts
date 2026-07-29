import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeFood, AiError, GeminiError } from "@/lib/gemini";
import { evaluateMealRewards } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/meals?date=YYYY-MM-DD — журнал поточного користувача */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Потрібен параметр date" }, { status: 400 });
  }
  const meals = await prisma.mealLog.findMany({
    where: { userId: auth.session.userId, date },
    // Найновіші зверху — так журнал читають частіше, ніж хронологічно.
    orderBy: { createdAt: "desc" },
    // Явний select без imageUrl: у старих записах там data:-URI по 400-680 КБ
    // база64 прямо в рядку Postgres. Просто вказати select з imageUrl: true й
    // відкинути значення ПІСЛЯ запиту не рятує — Prisma однаково перетягне
    // повний блоб із БД до того моменту. А цей екран узагалі ніде фото не
    // рендерить (MealCard показує лише опис/КБЖУ), тож полю тут нема чого
    // робити — не селектимо його зовсім.
    select: {
      id: true,
      userId: true,
      date: true,
      description: true,
      calories: true,
      protein: true,
      fats: true,
      carbs: true,
      status: true,
      createdAt: true,
    },
  });
  return NextResponse.json(meals);
}

const macros = {
  calories: z.number().int().nonnegative().max(50_000),
  protein: z.number().int().nonnegative().max(5_000),
  fats: z.number().int().nonnegative().max(5_000),
  carbs: z.number().int().nonnegative().max(5_000),
};

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата має бути YYYY-MM-DD"),
  description: z.string().min(1, "Потрібен опис страви"),
  // Було: повний data:-URI (400-680 КБ база64) від клієнта в imageUrl, або
  // сирий imageBase64 з того ж джерела. Фото потрібне рівно один раз — щоб
  // Gemini подивився, що на тарілці (/api/meals/analyze, окремий виклик,
  // нічого нікуди не пише) — і після цього більше ніде не читається: жоден
  // компонент у списку/картках не рендерить саму картинку, лише перевіряє
  // truthy. Тож замість байтів приймаємо прапорець.
  hasPhoto: z.boolean().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  apiKey: z.string().optional(),
  calories: macros.calories.optional(),
  protein: macros.protein.optional(),
  fats: macros.fats.optional(),
  carbs: macros.carbs.optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  let calories = d.calories;
  let protein = d.protein;
  let fats = d.fats;
  let carbs = d.carbs;

  const hasMacros =
    calories !== undefined &&
    protein !== undefined &&
    fats !== undefined &&
    carbs !== undefined;

  if (!hasMacros) {
    try {
      const ai = await analyzeFood({
        description: d.description,
        imageBase64: d.imageBase64,
        imageMimeType: d.imageMimeType,
        apiKey: d.apiKey,
      });
      calories = ai.calories;
      protein = ai.protein;
      fats = ai.fats;
      carbs = ai.carbs;
    } catch (err) {
      if (err instanceof AiError || err instanceof GeminiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json(
        { error: "Помилка аналізу страви" },
        { status: 502 },
      );
    }
  }

  // Фото було в аналізі (з клієнта чи камери) — картка «Доказ» дивиться лише
  // на «чи було», не на сам вміст. Колонка imageUrl лишається для сумісності
  // зі старими записами (там реальні base64), але нові пишуть тільки мітку.
  const hasPhoto = d.hasPhoto ?? !!d.imageBase64;
  const imageUrl = hasPhoto ? "1" : null;

  const meal = await prisma.mealLog.create({
    data: {
      userId: auth.session.userId,
      date: d.date,
      description: d.description,
      calories: calories!,
      protein: protein!,
      fats: fats!,
      carbs: carbs!,
      imageUrl,
      status: "approved",
    },
  });

  // Серверне ідемпотентне нарахування монет за звичку
  const rewards = await evaluateMealRewards(auth.session.userId, d.date);

  return NextResponse.json({ ...meal, rewards }, { status: 201 });
}
