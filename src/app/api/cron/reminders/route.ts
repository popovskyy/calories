import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/push";
import { getItem, SHIELD_ITEM_ID } from "@/lib/items";
import { humanDate, kyivHourNow, shiftYMD, todayYMD, weekStartYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Скільки днів мовчання вважаємо зникненням. */
const WINBACK_SILENCE_DAYS = 3;

/**
 * Cron: нагадування о ~20:00 Kyiv користувачам без запису їжі сьогодні.
 * Два розклади UTC (17 і 18) покривають літо/зиму; вікно 20–22 + dedupeKey.
 *
 * Не чіпаємо listDailyCards: когорта без їжі сьогодні вже провалила
 * early_start / early_finish, а listDailyCards ще й може грантити нагороди.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hour = kyivHourNow();
  if (hour < 20 || hour > 22) {
    return NextResponse.json({ ok: true, skipped: true, hour });
  }

  const today = todayYMD();
  const dedupeKey = `reminder:${today}`;

  const users = await prisma.user.findMany({
    where: {
      remindersEnabled: true,
      pushSubs: { some: {} },
      meals: {
        none: {
          date: today,
          status: { not: "cancelled" },
        },
      },
    },
    select: { id: true },
  });

  let sent = 0;
  await Promise.allSettled(
    users.map(async (user) => {
      await notifyUser(user.id, {
        kind: "reminder",
        title: "Час записати їжу",
        body: `Загляньте в журнал за ${humanDate(today)}.`,
        url: `/log?date=${today}`,
        dedupeKey,
      });
      sent += 1;
    }),
  );

  const returned = await runWinBack(today);

  return NextResponse.json({ ok: true, total: users.length, sent, winBack: returned });
}

/**
 * Повернення тих, хто зник на 3+ дні.
 *
 * Свідомо без жодного докору: людина, яка пропустила тиждень, і так почувається
 * винною — нагадування про це лише закріпить уникання. Тому дарунок і
 * запрошення замість статистики пропусків.
 */
async function runWinBack(today: string): Promise<number> {
  const since = shiftYMD(today, -WINBACK_SILENCE_DAYS);

  const lapsed = await prisma.user.findMany({
    where: {
      pushSubs: { some: {} },
      meals: { none: { date: { gte: since }, status: { not: "cancelled" } } },
      // Той, хто взагалі ніколи не логував, — не «повернення», а онбординг.
      claims: { some: { key: { startsWith: "daily_log:" } } },
    },
    select: { id: true },
  });

  // Тижневий ключ: подарунок раз на тиждень, а не щовечора.
  const giftKey = `winback:${weekStartYMD(today)}`;
  const shieldCap = getItem(SHIELD_ITEM_ID)?.maxStack ?? null;

  let count = 0;
  await Promise.allSettled(
    lapsed.map(async (user) => {
      // ItemUse з цим meta — і слід подарунка, і замок від повтору.
      const already = await prisma.itemUse.findFirst({
        where: { userId: user.id, itemId: SHIELD_ITEM_ID, meta: giftKey },
        select: { id: true },
      });
      if (already) return;

      const current = await prisma.userItem.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: SHIELD_ITEM_ID } },
        select: { qty: true },
      });
      const atCap = shieldCap !== null && (current?.qty ?? 0) >= shieldCap;

      await prisma.$transaction([
        // Стеля інвентаря діє й на подарунок — але слід лишаємо в будь-якому разі,
        // щоб пуш не повторювався щовечора.
        ...(atCap
          ? []
          : [
              prisma.userItem.upsert({
                where: { userId_itemId: { userId: user.id, itemId: SHIELD_ITEM_ID } },
                create: { userId: user.id, itemId: SHIELD_ITEM_ID, qty: 1 },
                update: { qty: { increment: 1 } },
              }),
            ]),
        prisma.itemUse.create({
          data: {
            userId: user.id,
            itemId: SHIELD_ITEM_ID,
            date: today,
            meta: giftKey,
          },
        }),
      ]);

      await notifyUser(user.id, {
        kind: "system",
        title: "Твій маскот скучив",
        body: atCap
          ? "Повертайся, коли готовий — усе на місці."
          : "Тримай Щит стріку в подарунок — почни знову, коли готовий.",
        url: "/",
        dedupeKey: giftKey,
      });
      count += 1;
    }),
  );

  return count;
}
