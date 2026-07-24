import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { calcTargetCalories } from "@/lib/calories";
import { generateMascotAvatar } from "@/lib/gemini-avatar";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const currentYear = new Date().getFullYear();

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Логін мін. 3 символи")
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Лише латиниця, цифри та _"),
  password: z.string().min(6, "Пароль мін. 6 символів").max(128),
  name: z.string().min(1, "Ім'я обов'язкове").max(64),
  birthYear: z.number().int().min(1920).max(currentYear),
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
  weight: z.number().positive(),
  height: z.number().positive(),
  avatarUrl: z.string().max(2_500_000).nullable().optional(),
  // фото для генерації аватара під час реєстрації (ще немає сесії)
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const { username, password, avatarUrl, imageBase64, imageMimeType, ...profile } =
    parsed.data;
  const login = username.toLowerCase();

  const exists = await prisma.user.findUnique({ where: { username: login } });
  if (exists) {
    return NextResponse.json(
      { error: "Такий логін уже зайнятий" },
      { status: 409 },
    );
  }

  let finalAvatar = avatarUrl ?? null;
  let avatarWarning: string | null = null;
  if (imageBase64) {
    try {
      finalAvatar = await generateMascotAvatar({
        imageBase64,
        imageMimeType,
      });
    } catch (err) {
      avatarWarning =
        err instanceof Error
          ? err.message
          : "Не вдалося згенерувати аватар";
      console.error("[register] avatar generation failed:", avatarWarning);
      // лишаємо preset / попередній avatarUrl якщо був
      finalAvatar = avatarUrl ?? null;
    }
  }

  const { targetCalories } = calcTargetCalories({
    birthYear: profile.birthYear,
    birthMonth: profile.birthMonth,
    sex: profile.sex,
    weightKg: profile.weight,
    heightCm: profile.height,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username: login,
      passwordHash,
      name: profile.name,
      birthYear: profile.birthYear,
      birthMonth: profile.birthMonth,
      sex: profile.sex,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      weight: profile.weight,
      height: profile.height,
      targetCalories,
      avatarUrl: finalAvatar,
    },
  });

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
  });
  await setSessionCookie(token);

  return NextResponse.json(
    { ...toUserDTO(user), avatarWarning },
    { status: 201 },
  );
}
