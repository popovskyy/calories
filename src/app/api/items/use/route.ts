import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildShop } from "@/lib/shop";
import { BOX_ITEM_ID, CARD_REROLL_ITEM_ID, boxFullCompensation, getItem, rollBox, type ItemDef } from "@/lib/items";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import { todayYMD, weekStartYMD } from "@/lib/date";
import { dailyCardClaimKey, pickDailyCards } from "@/lib/daily-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  itemId: z.string().min(1),
  /** Ціль застосування: код квесту для ре-ролу тощо. */
  meta: z.string().max(64).optional(),
});

/** Чи не вичерпано добовий/тижневий ліміт застосувань. */
async function limitReached(
  userId: string,
  def: ItemDef,
  today: string,
): Promise<string | null> {
  if (def.usesPerDay !== null) {
    const n = await prisma.itemUse.count({
      where: { userId, itemId: def.id, date: today },
    });
    if (n >= def.usesPerDay) {
      return `Сьогодні вже використано (${def.usesPerDay}/день)`;
    }
  }
  if (def.usesPerWeek !== null) {
    const n = await prisma.itemUse.count({
      where: { userId, itemId: def.id, date: { gte: weekStartYMD() } },
    });
    if (n >= def.usesPerWeek) {
      return `Цього тижня вже використано (${def.usesPerWeek}/тиждень)`;
    }
  }
  return null;
}

/** POST /api/items/use — застосувати предмет з інвентаря. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const def = getItem(parsed.data.itemId);
  if (!def) return NextResponse.json({ error: "Предмет не знайдено" }, { status: 404 });
  if (def.passive) {
    return NextResponse.json(
      { error: `${def.nameUk} спрацьовує сам — застосовувати не треба` },
      { status: 400 },
    );
  }

  const userId = auth.session.userId;
  const today = todayYMD();

  const limit = await limitReached(userId, def, today);
  if (limit) return NextResponse.json({ error: limit }, { status: 409 });

  // Ре-рол після claim = повторна виплата нової пари; блокуємо, якщо вже забрали.
  if (def.id === CARD_REROLL_ITEM_ID) {
    const rerolls = await prisma.itemUse.count({
      where: { userId, itemId: CARD_REROLL_ITEM_ID, date: today },
    });
    const defs = pickDailyCards(userId, today, rerolls);
    const keys = [
      ...defs.map((d) => dailyCardClaimKey(today, rerolls, d.code)),
      ...defs.map((d) => `dc:${today}:${d.code}`),
    ];
    const claimed = await prisma.rewardClaim.count({
      where: { userId, key: { in: keys } },
    });
    if (claimed > 0) {
      return NextResponse.json(
        { error: "Спочатку дограйте поточні картки — після нагороди перетягувати не можна" },
        { status: 409 },
      );
    }
  }

  // Списання одиниці й факт застосування — атомарно, інакше при збої
  // предмет зникне без ефекту (або, гірше, спрацює двічі).
  try {
    await prisma.$transaction(async (tx) => {
      const spent = await tx.userItem.updateMany({
        where: { userId, itemId: def.id, qty: { gte: 1 } },
        data: { qty: { decrement: 1 } },
      });
      if (spent.count === 0) {
        throw Object.assign(new Error("EMPTY"), { code: "EMPTY" });
      }
      await tx.itemUse.create({
        data: { userId, itemId: def.id, date: today, meta: parsed.data.meta ?? null },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "EMPTY") {
      return NextResponse.json({ error: "Цього предмета немає в інвентарі" }, { status: 409 });
    }
    throw e;
  }

  // Скринька — єдиний предмет із випадковим ефектом, тож видаємо його вміст.
  const granted: GrantedReward[] = [];
  let boxLabel: string | null = null;
  if (def.id === BOX_ITEM_ID) {
    const outcome = rollBox();
    boxLabel = outcome.labelUk;

    if (outcome.coins > 0) {
      // Ключ із часом: скриньку можна відкривати багато разів.
      await grant(
        userId,
        `box:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        outcome.coins,
        `Скринька: ${outcome.labelUk}`,
        granted,
      );
    }
    if (outcome.itemId) {
      const prize = getItem(outcome.itemId);
      const cap = prize?.maxStack ?? null;
      const cur = await prisma.userItem.findUnique({
        where: { userId_itemId: { userId, itemId: outcome.itemId } },
        select: { qty: true },
      });
      // Стеля інвентаря діє й на призи: інакше скринькою можна обійти ліміт щитів.
      if (cap === null || (cur?.qty ?? 0) < cap) {
        await prisma.userItem.upsert({
          where: { userId_itemId: { userId, itemId: outcome.itemId } },
          create: { userId, itemId: outcome.itemId, qty: 1 },
          update: { qty: { increment: 1 } },
        });
      } else {
        // Інвентар повний — компенсуємо половиною ціни предмета.
        const coins = boxFullCompensation(outcome.itemId);
        boxLabel = `${outcome.labelUk} (інвентар повний → ${coins} монет)`;
        await grant(
          userId,
          `box:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          coins,
          "Скринька: компенсація",
          granted,
        );
      }
    }
  }

  const shop = await buildShop(userId);
  return NextResponse.json({ shop, granted, boxLabel, used: def.id });
}
