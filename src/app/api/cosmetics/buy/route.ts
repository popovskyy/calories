import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { getCosmetic } from "@/lib/cosmetics";
import { spendInTx } from "@/lib/reward-grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["finisher", "title", "frame", "soundpack"]),
  cosmeticId: z.string().min(1),
});

/** POST /api/cosmetics/buy — купити фінішер / титул / рамку / саундпак. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const { kind, cosmeticId } = parsed.data;
  const def = getCosmetic(kind, cosmeticId);
  if (!def) return NextResponse.json({ error: "Річ не знайдено" }, { status: 404 });

  // Заслужена косметика не має ціни принципово — саме в цьому її цінність.
  if (def.unlock.via !== "shop") {
    return NextResponse.json(
      { error: "Це не продається — тільки заробляється" },
      { status: 400 },
    );
  }

  const userId = auth.session.userId;
  const price = def.unlock.price;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userCosmetic.findUnique({
        where: { userId_kind_cosmeticId: { userId, kind, cosmeticId } },
      });
      if (existing) throw Object.assign(new Error("OWNED"), { code: "OWNED" });

      const paid = await spendInTx(
        tx,
        userId,
        price,
        "cosmetic",
        `${kind}:${cosmeticId}`,
        `Купівля: ${def.nameUk}`,
      );
      if (!paid) throw Object.assign(new Error("BROKE"), { code: "BROKE" });

      await tx.userCosmetic.create({ data: { userId, kind, cosmeticId } });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "OWNED" || code === "P2002") {
      return NextResponse.json({ error: "Уже куплено" }, { status: 409 });
    }
    if (code === "BROKE") {
      return NextResponse.json({ error: "Недостатньо монет" }, { status: 409 });
    }
    throw e;
  }

  const shop = await buildShop(userId);
  return NextResponse.json(shop, { status: 201 });
}
