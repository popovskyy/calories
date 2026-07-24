import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { analyzeFood, GeminiError } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/meals?userId=&date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const date = req.nextUrl.searchParams.get("date");
  if (!userId || !date) {
    return NextResponse.json(
      { error: "Потрібні параметри userId і date" },
      { status: 400 },
    );
  }
  const meals = await prisma.mealLog.findMany({
    where: { userId, date },
    orderBy: { createdAt: "asc" },
  });
  // createdAt: Date серіалізується у ISO-рядок (MealDTO) автоматично
  return NextResponse.json(meals);
}

const macros = {
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  fats: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
};

const saveSchema = z.object({
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата має бути YYYY-MM-DD"),
  description: z.string().min(1, "Потрібен опис страви"),
  imageUrl: z.string().optional().nullable(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  apiKey: z.string().optional(),
  // Якщо БЖУ вже пораховані на клієнті — зберігаємо без повторного виклику Gemini.
  calories: macros.calories.optional(),
  protein: macros.protein.optional(),
  fats: macros.fats.optional(),
  carbs: macros.carbs.optional(),
});

/**
 * POST /api/meals — зберегти прийом їжі.
 * Якщо БЖУ передані — зберігаємо напряму; інакше аналізуємо через Gemini й зберігаємо.
 */
export async function POST(req: NextRequest) {
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
      if (err instanceof GeminiError) {
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
      userId: d.userId,
      date: d.date,
      description: d.description,
      calories: calories!,
      protein: protein!,
      fats: fats!,
      carbs: carbs!,
      imageUrl: d.imageUrl ?? null,
    },
  });

  return NextResponse.json(meal, { status: 201 });
}
