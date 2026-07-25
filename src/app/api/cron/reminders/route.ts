import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/push";
import { humanDate, kyivHourNow, todayYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron: нагадування о ~20:00 Kyiv користувачам без запису їжі сьогодні.
 * Два розклади UTC (17 і 18) покривають літо/зиму; вікно 20–22 + dedupeKey.
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

  return NextResponse.json({ ok: true, total: users.length, sent });
}
