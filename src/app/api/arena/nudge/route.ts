import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { notifyUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ userId: z.string().min(1) });

/**
 * POST /api/arena/nudge — дружній штурхан суперника з арени.
 *
 * Ліміт: раз на годину на пару відправник→отримувач. Тримається на
 * dedupeKey інбоксу (@@unique([userId, dedupeKey])), тож окремої таблиці
 * не треба, а notifyUser лишається ідемпотентним навіть при гонці.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }
  const targetId = parsed.data.userId;
  if (targetId === auth.session.userId) {
    return NextResponse.json({ error: "Себе штурхати не можна" }, { status: 400 });
  }

  const [sender, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, approved: true },
    }),
  ]);
  if (!sender) return NextResponse.json({ error: "Немає сесії" }, { status: 401 });
  if (!target?.approved) {
    return NextResponse.json({ error: "Гравця не знайдено" }, { status: 404 });
  }

  // Календарна година UTC: "2026-07-27T14"
  const hourBucket = new Date().toISOString().slice(0, 13);
  const dedupeKey = `nudge:${auth.session.userId}:${hourBucket}`;

  const already = await prisma.notification.findUnique({
    where: { userId_dedupeKey: { userId: targetId, dedupeKey } },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { error: "Штурхати можна раз на годину" },
      { status: 429 },
    );
  }

  await notifyUser(targetId, {
    kind: "nudge",
    title: `👉 ${sender.name} штурхає тебе`,
    body: "Як там сьогоднішня норма? Арена чекає на твій запис.",
    url: "/arena",
    dedupeKey,
  });

  return NextResponse.json({ ok: true });
}
