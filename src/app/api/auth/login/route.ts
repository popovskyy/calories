import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BLOCKED_FALLBACK_REASON,
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setThemeCookie } from "@/lib/theme-cookie";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Введіть логін"),
  password: z.string().min(1, "Введіть пароль"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const login = parsed.data.username.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username: login },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Невірний логін або пароль" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Невірний логін або пароль" },
      { status: 401 },
    );
  }

  // Заблокованому сесію не видаємо взагалі: інакше він зайшов би «всередину» і
  // побачив оверлей, ніби додаток працює. Причину показуємо прямо на екрані
  // входу — людина має розуміти, за що і до кого йти.
  if (user.blockedAt) {
    return NextResponse.json(
      {
        error: user.blockReason?.trim() || BLOCKED_FALLBACK_REASON,
        code: "BLOCKED",
      },
      { status: 403 },
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
  });
  await setSessionCookie(token);
  await setThemeCookie(user.theme ?? "nocturne");

  return NextResponse.json(toUserDTO(user));
}
