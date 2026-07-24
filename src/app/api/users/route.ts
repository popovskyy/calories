import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { calcTargetCalories } from "@/lib/calories";
import { prisma } from "@/lib/prisma";
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
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: z.enum(["maintain", "deficit"]),
  weight: z.number().positive("Вага має бути більшою за 0"),
  height: z.number().positive("Зріст має бути більшим за 0"),
  avatarUrl: z
    .string()
    .max(2_500_000, "Аватар занадто великий")
    .nullable()
    .optional(),
});

/** GET — поточний користувач з сесії */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
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

  const { avatarUrl, ...fields } = parsed.data;
  const { targetCalories } = calcTargetCalories({
    birthYear: fields.birthYear,
    birthMonth: fields.birthMonth,
    sex: fields.sex,
    weightKg: fields.weight,
    heightCm: fields.height,
    activityLevel: fields.activityLevel,
    goal: fields.goal,
  });

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: {
      ...fields,
      targetCalories,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });

  return NextResponse.json(toUserDTO(user));
}
