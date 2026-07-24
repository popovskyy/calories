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
    orderBy: { createdAt: "asc" },
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
  imageUrl: z.string().optional().nullable(),
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

  const meal = await prisma.mealLog.create({
    data: {
      userId: auth.session.userId,
      date: d.date,
      description: d.description,
      calories: calories!,
      protein: protein!,
      fats: fats!,
      carbs: carbs!,
      imageUrl: d.imageUrl ?? null,
      status: "approved",
    },
  });

  // Серверне ідемпотентне нарахування монет за звичку
  const rewards = await evaluateMealRewards(auth.session.userId, d.date);

  return NextResponse.json({ ...meal, rewards }, { status: 201 });
}
