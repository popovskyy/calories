import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listQuestStatus, pickReplacementQuest } from "@/lib/quests";
import { getItem, QUEST_REROLL_ITEM_ID } from "@/lib/items";
import { todayYMD, weekStartYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(1) });

/**
 * POST /api/quests/reroll — замінити один квест тижня.
 *
 * Автономія проти вигорання: гравець, якому не дався «Марафонець», не
 * лишається з мертвим квестом на тиждень, а сам формує свій виклик.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const userId = auth.session.userId;
  const weekStart = weekStartYMD();
  const def = getItem(QUEST_REROLL_ITEM_ID)!;

  const current = await listQuestStatus(userId, weekStart);
  const target = current.quests.find((q) => q.code === parsed.data.code);
  if (!target) {
    return NextResponse.json({ error: "Квест не знайдено" }, { status: 404 });
  }
  if (target.claimed) {
    return NextResponse.json(
      { error: "Виконаний квест не міняють" },
      { status: 409 },
    );
  }

  // Тижневий ліміт: інакше ре-роли перетворяться на пошук найлегшого квеста.
  if (def.usesPerWeek !== null) {
    const used = await prisma.itemUse.count({
      where: {
        userId,
        itemId: QUEST_REROLL_ITEM_ID,
        meta: { startsWith: `${weekStart}:` },
      },
    });
    if (used >= def.usesPerWeek) {
      return NextResponse.json(
        { error: `Цього тижня вже ${def.usesPerWeek}/${def.usesPerWeek} ре-ролів` },
        { status: 409 },
      );
    }
  }

  const replacement = pickReplacementQuest(
    userId,
    weekStart,
    target.code,
    current.quests.map((q) => q.code),
  );
  if (!replacement) {
    return NextResponse.json({ error: "Немає на що міняти" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const spent = await tx.userItem.updateMany({
        where: { userId, itemId: QUEST_REROLL_ITEM_ID, qty: { gte: 1 } },
        data: { qty: { decrement: 1 } },
      });
      if (spent.count === 0) {
        throw Object.assign(new Error("EMPTY"), { code: "EMPTY" });
      }
      await tx.itemUse.create({
        data: {
          userId,
          itemId: QUEST_REROLL_ITEM_ID,
          date: todayYMD(),
          meta: `${weekStart}:${target.code}:${replacement.code}`,
        },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "EMPTY") {
      return NextResponse.json(
        { error: "Немає ре-ролів. Купи в крамниці" },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json(await listQuestStatus(userId, weekStart), { status: 201 });
}
