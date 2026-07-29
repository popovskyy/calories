import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { todayYMD } from "@/lib/date";
import { calcTargetCalories, isGoal, isSex } from "@/lib/calories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/weight — історія зважувань (для спарклайна і прогнозу). */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // Беремо саме СВІЖІ записи (desc + take), інакше після 90 зважувань
  // графік застиг би на найстаріших. Клієнту віддаємо за зростанням дати.
  const rows = await prisma.weightLog.findMany({
    where: { userId: auth.session.userId },
    orderBy: { date: "desc" },
    take: 180,
    select: { date: true, weight: true },
  });
  return NextResponse.json({ items: rows.reverse() });
}

const schema = z.object({
  weight: z
    .number()
    .min(30, "Вага має бути від 30 кг")
    .max(300, "Вага має бути до 300 кг"),
});

/**
 * POST /api/weight — швидке зважування без відкриття форми профілю.
 *
 * Робить те саме, що зміна ваги через профіль: оновлює user.weight,
 * перераховує норму калорій і пише точку в WeightLog (одна на день,
 * останнє значення перемагає) — з неї живляться ваговий епік,
 * detectPlateau і прогноз.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const weight = Math.round(parsed.data.weight * 10) / 10;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: {
      birthYear: true,
      birthMonth: true,
      sex: true,
      height: true,
      goal: true,
      targetWeight: true,
      targetWeeks: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  const { targetCalories } = calcTargetCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: isSex(user.sex) ? user.sex : "male",
    weightKg: weight,
    heightCm: user.height,
    goal: isGoal(user.goal) ? user.goal : "maintain",
    targetWeightKg: user.targetWeight,
    targetWeeks: user.targetWeeks,
  });

  const date = todayYMD();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: auth.session.userId },
      data: { weight, targetCalories },
    }),
    prisma.weightLog.upsert({
      where: { userId_date: { userId: auth.session.userId, date } },
      create: { userId: auth.session.userId, date, weight },
      update: { weight },
    }),
  ]);

  return NextResponse.json({ ok: true, date, weight });
}
