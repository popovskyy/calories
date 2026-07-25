import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { getTheme, isThemeId } from "@/lib/theme-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ themeId: z.string().min(1) });

/** POST /api/shop/theme/buy — купити преміум-тему. */
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
  if (theme.tier !== "premium") {
    return NextResponse.json({ error: "Тема недоступна для купівлі" }, { status: 400 });
  }

  const userId = auth.session.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userTheme.findUnique({
        where: { userId_themeId: { userId, themeId: theme.id } },
      });
      if (existing) {
        throw Object.assign(new Error("OWNED"), { code: "OWNED" });
      }

      const paid = await tx.user.updateMany({
        where: { id: userId, coins: { gte: theme.price } },
        data: { coins: { decrement: theme.price } },
      });
      if (paid.count === 0) {
        throw Object.assign(new Error("BROKE"), { code: "BROKE" });
      }

      await tx.userTheme.create({ data: { userId, themeId: theme.id } });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "OWNED" || code === "P2002") {
      return NextResponse.json({ error: "Тему вже куплено" }, { status: 409 });
    }
    if (code === "BROKE") {
      return NextResponse.json({ error: "Недостатньо монет" }, { status: 409 });
    }
    throw e;
  }

  const shop = await buildShop(userId);
  return NextResponse.json(shop, { status: 201 });
}
