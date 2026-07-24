import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPresetUrl } from "@/lib/avatar-presets";
import { getSkinDef } from "@/lib/skin-catalog";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ skinId: z.string().min(1) });

/** POST /api/shop/equip — вдягнути скін (free або куплений). */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const skin = await getSkinDef(parsed.data.skinId);
  if (!skin || !skin.enabled) {
    return NextResponse.json({ error: "Скін не знайдено" }, { status: 404 });
  }

  const userId = auth.session.userId;

  if (skin.tier === "premium") {
    const owned = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId, skinId: skin.id } },
    });
    if (!owned) {
      return NextResponse.json({ error: "Спершу купіть скін" }, { status: 403 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: toPresetUrl(skin.id) },
    include: { skins: { select: { skinId: true } } },
  });

  return NextResponse.json(toUserDTO(user));
}
