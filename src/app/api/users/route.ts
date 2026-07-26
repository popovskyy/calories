import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { calcTargetCalories } from "@/lib/calories";
import { todayYMD } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { syncArenaRewards } from "@/lib/rewards";
import { assertAvatarAllowed } from "@/lib/skin-catalog";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const currentYear = new Date().getFullYear();

const updateSchema = z.object({
  name: z.string().min(1, "Ім'я обов'язкове"),
  birthYear: z
    .number()
    .int()
    .min(1920, "Рік народження занадто малий")
    .max(currentYear, "Рік народження не може бути в майбутньому"),
  birthMonth: z.number().int().min(1).max(12),
  sex: z.enum(["male", "female"]),
  activityLevel: z
    .enum([
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active",
    ])
    .optional(),
  goal: z.enum(["maintain", "deficit"]),
  weight: z.number().positive("Вага має бути більшою за 0"),
  height: z.number().positive("Зріст має бути більшим за 0"),
  avatarUrl: z
    .string()
    .max(2_500_000, "Аватар занадто великий")
    .nullable()
    .optional(),
  targetWeight: z.number().positive().nullable().optional(),
  targetWeeks: z.number().int().min(1).max(104).nullable().optional(),
});

/** GET — поточний користувач (+ sync вчорашньої арени після settle). */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  await syncArenaRewards(auth.session.userId);

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }
  return NextResponse.json(toUserDTO(user));
}

/** POST — оновити свій профіль */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const { avatarUrl, targetWeight, targetWeeks, ...fields } = parsed.data;

  if (avatarUrl !== undefined) {
    const gate = await assertAvatarAllowed(auth.session.userId, avatarUrl);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 });
    }
  }

  const { targetCalories } = calcTargetCalories({
    birthYear: fields.birthYear,
    birthMonth: fields.birthMonth,
    sex: fields.sex,
    weightKg: fields.weight,
    heightCm: fields.height,
    goal: fields.goal,
  });

  // Якщо змінили ціль по вазі — скидаємо startWeight і startWeightDate
  const existing = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { targetWeight: true, targetWeeks: true, weight: true },
  });

  const goalChanged =
    (targetWeight !== undefined &&
      targetWeight !== (existing?.targetWeight ?? null)) ||
    (targetWeeks !== undefined &&
      targetWeeks !== (existing?.targetWeeks ?? null));

  const goalData: Record<string, unknown> = {};
  if (targetWeight !== undefined) goalData.targetWeight = targetWeight;
  if (targetWeeks !== undefined) goalData.targetWeeks = targetWeeks;
  if (goalChanged) {
    goalData.startWeight = fields.weight;
    goalData.startWeightDate = todayYMD();
  }

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: {
      ...fields,
      activityLevel: "sedentary",
      targetCalories,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...goalData,
    },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });

  // Історія ваги: одна точка на день, останнє значення перемагає.
  // Без неї ваговий епік і виявлення плато не мають на що спертись,
  // а прогноз бачить лише одне поточне число.
  await prisma.weightLog.upsert({
    where: { userId_date: { userId: auth.session.userId, date: todayYMD() } },
    create: { userId: auth.session.userId, date: todayYMD(), weight: fields.weight },
    update: { weight: fields.weight },
  });

  return NextResponse.json(toUserDTO(user));
}
