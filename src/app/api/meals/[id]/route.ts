import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  description: z.string().trim().min(1, "Опис обов'язковий").max(500),
  calories: z.number().int().min(0).max(50_000),
  protein: z.number().int().min(0).max(5_000),
  fats: z.number().int().min(0).max(5_000),
  carbs: z.number().int().min(0).max(5_000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата YYYY-MM-DD")
    .optional(),
});

/** PATCH /api/meals/:id — редагувати свій запис */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const meal = await prisma.mealLog.findUnique({ where: { id } });
  if (!meal || meal.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Запис не знайдено" }, { status: 404 });
  }
  if (meal.status === "cancelled") {
    return NextResponse.json({ error: "Запис скасовано адміном" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const updated = await prisma.mealLog.update({
    where: { id },
    data: {
      description: d.description,
      calories: d.calories,
      protein: d.protein,
      fats: d.fats,
      carbs: d.carbs,
      ...(d.date ? { date: d.date } : {}),
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/meals/:id — лише свої записи */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const meal = await prisma.mealLog.findUnique({ where: { id } });
  if (!meal || meal.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Запис не знайдено" }, { status: 404 });
  }
  await prisma.mealLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
