import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { getItem } from "@/lib/items";
import {
  getWeeklyStock,
  slotQuantity,
  stallPurchaseKey,
} from "@/lib/shop-rotation";
import { spendInTx } from "@/lib/reward-grant";
import { weekStartYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  itemId: z.string().min(1),
  /** Купівля через слот ротаційного прилавка (знижка / набір). */
  fromStall: z.boolean().optional(),
});

/** POST /api/items/buy — купити витратне спорядження. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const def = getItem(parsed.data.itemId);
  if (!def) return NextResponse.json({ error: "Предмет не знайдено" }, { status: 404 });

  const userId = auth.session.userId;

  // Ціна прилавка береться з серверної ротації, а не з тіла запиту —
  // інакше клієнт міг би оголосити будь-яку знижку.
  let price = def.price;
  let qty = 1;
  let stallKey: string | null = null;
  if (parsed.data.fromStall) {
    const weekStart = weekStartYMD();
    const slot = getWeeklyStock(weekStart).find(
      (s) => s.refId === def.id && s.kind !== "cosmetic",
    );
    if (!slot) {
      return NextResponse.json(
        { error: "Цього товару зараз немає на прилавку" },
        { status: 409 },
      );
    }
    price = slot.price;
    qty = slotQuantity(slot);
    stallKey = stallPurchaseKey(weekStart, slot.kind, slot.refId);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Один слот прилавка = одна покупка на тиждень. RewardClaim з coins:0
      // лише сторожить унікальність — монети списує spendInTx нижче.
      if (stallKey) {
        try {
          await tx.rewardClaim.create({
            data: { userId, key: stallKey, coins: 0 },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            throw Object.assign(new Error("STALL_BOUGHT"), { code: "STALL_BOUGHT" });
          }
          throw e;
        }
      }

      const current = await tx.userItem.findUnique({
        where: { userId_itemId: { userId, itemId: def.id } },
        select: { qty: true },
      });
      const have = current?.qty ?? 0;

      if (def.maxStack !== null && have + qty > def.maxStack) {
        throw Object.assign(new Error("FULL"), { code: "FULL" });
      }

      const paid = await spendInTx(tx, userId, price, "item", def.id, `Купівля: ${def.nameUk}`);
      if (!paid) throw Object.assign(new Error("BROKE"), { code: "BROKE" });

      await tx.userItem.upsert({
        where: { userId_itemId: { userId, itemId: def.id } },
        create: { userId, itemId: def.id, qty },
        update: { qty: { increment: qty } },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "FULL") {
      return NextResponse.json(
        { error: `Більше ${def.maxStack} не влізе в інвентар` },
        { status: 409 },
      );
    }
    if (code === "STALL_BOUGHT") {
      return NextResponse.json(
        { error: "Цей слот прилавка вже куплено цього тижня" },
        { status: 409 },
      );
    }
    if (code === "BROKE") {
      return NextResponse.json({ error: "Недостатньо монет" }, { status: 409 });
    }
    throw e;
  }

  const shop = await buildShop(userId);
  return NextResponse.json(shop, { status: 201 });
}
