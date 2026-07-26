import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { getCosmetic, isDefaultCosmetic, isEarned } from "@/lib/cosmetics";
import { completedEpicIds } from "@/lib/epic-progress";
import { countInTargetDays } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["finisher", "title", "frame", "soundpack"]),
  /** null знімає титул / рамку. */
  cosmeticId: z.string().min(1).nullable(),
});

const FIELD = {
  finisher: "finisher",
  title: "title",
  frame: "frame",
  soundpack: "soundpack",
} as const;

/** POST /api/cosmetics/equip — вдягнути (або зняти) косметику. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const { kind, cosmeticId } = parsed.data;
  const userId = auth.session.userId;

  // Зняти можна лише те, що не обов'язкове: фінішер і саундпак завжди є базові.
  if (cosmeticId === null) {
    if (kind === "finisher" || kind === "soundpack") {
      return NextResponse.json({ error: "Це не можна зняти" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: userId }, data: { [FIELD[kind]]: null } });
    return NextResponse.json(await buildShop(userId));
  }

  const def = getCosmetic(kind, cosmeticId);
  if (!def) return NextResponse.json({ error: "Річ не знайдено" }, { status: 404 });

  // Володіння перевіряємо на сервері: клієнт міг би підсунути будь-який id.
  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_kind_cosmeticId: { userId, kind, cosmeticId } },
  });

  if (!owned && !isDefaultCosmetic(def)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { maxStreak: true },
    });
    const [inTargetDays, doneEpics] = await Promise.all([
      countInTargetDays(userId),
      completedEpicIds(userId),
    ]);
    const earned = isEarned(def, {
      maxStreak: user?.maxStreak ?? 0,
      inTargetDays,
      completedEpicIds: doneEpics,
    });
    if (!earned) {
      return NextResponse.json({ error: "Спершу треба здобути" }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { [FIELD[kind]]: cosmeticId },
  });

  return NextResponse.json(await buildShop(userId));
}
