import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setThemeCookie } from "@/lib/theme-cookie";
import { getTheme, isThemeId } from "@/lib/theme-catalog";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ themeId: z.string().min(1) });

/** POST /api/shop/theme/equip — вдягнути тему (free або куплену). */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  if (!isThemeId(parsed.data.themeId)) {
    return NextResponse.json({ error: "Тему не знайдено" }, { status: 404 });
  }

  const theme = getTheme(parsed.data.themeId);
  const userId = auth.session.userId;

  if (theme.tier === "premium") {
    const owned = await prisma.userTheme.findUnique({
      where: { userId_themeId: { userId, themeId: theme.id } },
    });
    if (!owned) {
      return NextResponse.json({ error: "Спершу купіть тему" }, { status: 403 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { theme: theme.id },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });

  await setThemeCookie(theme.id);

  return NextResponse.json(toUserDTO(user));
}
