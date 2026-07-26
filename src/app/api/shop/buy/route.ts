import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { getSkinDef } from "@/lib/skin-catalog";
import { spendInTx } from "@/lib/reward-grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ skinId: z.string().min(1) });

/** POST /api/shop/buy — атомарна купівля (не йде в мінус). */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const skin = await getSkinDef(parsed.data.skinId);
  if (!skin || !skin.enabled || skin.tier !== "premium") {
    return NextResponse.json({ error: "Скін недоступний" }, { status: 404 });
  }

  const userId = auth.session.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userSkin.findUnique({
        where: { userId_skinId: { userId, skinId: skin.id } },
      });
      if (existing) {
        throw Object.assign(new Error("OWNED"), { code: "OWNED" });
      }

      const paid = await spendInTx(
        tx,
        userId,
        skin.price,
        "skin",
        skin.id,
        `Купівля скіна: ${skin.nameUk}`,
      );
      if (!paid) {
        throw Object.assign(new Error("BROKE"), { code: "BROKE" });
      }

      await tx.userSkin.create({ data: { userId, skinId: skin.id } });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "OWNED" || code === "P2002") {
      return NextResponse.json({ error: "Скін уже куплено" }, { status: 409 });
    }
    if (code === "BROKE") {
      return NextResponse.json({ error: "Недостатньо монет" }, { status: 409 });
    }
    throw e;
  }

  const shop = await buildShop(userId);
  return NextResponse.json(shop, { status: 201 });
}
