import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { isAllowedAvatarUrl } from "@/lib/avatar-presets";
import { calcTargetCalories } from "@/lib/calories";
import { todayYMD } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { isThemeId } from "@/lib/theme-catalog";
import { setThemeCookie } from "@/lib/theme-cookie";
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
    .max(128, "Невірний аватар")
    .nullable()
    .optional(),
  targetWeight: z.number().positive().nullable().optional(),
  theme: z.string().optional(),
});

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

  const { avatarUrl, targetWeight, theme, ...fields } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { targetWeight: true, weight: true, avatarUrl: true },
  });

  // Старий пресет (напр. покарання) можна лишити, але новий обрати лише з дозволених.
  if (
    avatarUrl !== undefined &&
    !isAllowedAvatarUrl(avatarUrl) &&
    avatarUrl !== (existing?.avatarUrl ?? null)
  ) {
    return NextResponse.json({ error: "Невірний аватар" }, { status: 400 });
  }
  if (theme !== undefined && !isThemeId(theme)) {
    return NextResponse.json({ error: "Невідома тема" }, { status: 400 });
  }

  const { targetCalories } = calcTargetCalories({
    birthYear: fields.birthYear,
    birthMonth: fields.birthMonth,
    sex: fields.sex,
    weightKg: fields.weight,
    heightCm: fields.height,
    goal: fields.goal,
  });

  const goalChanged =
    targetWeight !== undefined &&
    targetWeight !== (existing?.targetWeight ?? null);

  const goalData: Record<string, unknown> = {};
  if (targetWeight !== undefined) goalData.targetWeight = targetWeight;
  if (goalChanged) {
    goalData.startWeight = fields.weight;
    goalData.startWeightDate = todayYMD();
  }

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: {
      ...fields,
      targetCalories,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...goalData,
    },
  });

  if (theme !== undefined) {
    await setThemeCookie(theme);
  }

  await prisma.weightLog.upsert({
    where: { userId_date: { userId: auth.session.userId, date: todayYMD() } },
    create: { userId: auth.session.userId, date: todayYMD(), weight: fields.weight },
    update: { weight: fields.weight },
  });

  return NextResponse.json(toUserDTO(user));
}
