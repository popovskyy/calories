import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  acceptDuel,
  createDuel,
  declineDuel,
  listDuels,
  settleDuels,
} from "@/lib/duel";
import { getReliefStatus } from "@/lib/relief";
import { DUEL_MAX_STAKE } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/duels — дуелі + список суперників (спершу закриває минулі тижні). */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const userId = auth.session.userId;

  try {
    await settleDuels(userId);
  } catch (e) {
    console.error("[duels] settle", e);
  }

  // Баланс суперника потрібен, щоб не запропонувати ставку, яку він не тягне.
  const [duels, rivals, relief] = await Promise.all([
    listDuels(userId),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, coins: true },
      orderBy: { name: "asc" },
    }),
    getReliefStatus(userId),
  ]);

  return NextResponse.json({ duels, rivals, relief });
}

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("challenge"),
    opponentId: z.string().min(1),
    stake: z.number().int().min(0).max(DUEL_MAX_STAKE).optional(),
  }),
  z.object({ action: z.literal("accept"), duelId: z.string().min(1) }),
  z.object({ action: z.literal("decline"), duelId: z.string().min(1) }),
]);

/** POST /api/duels — кинути виклик, прийняти або відхилити. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const userId = auth.session.userId;
  const body = parsed.data;

  if (body.action === "challenge") {
    const res = await createDuel(userId, body.opponentId, body.stake);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  } else if (body.action === "accept") {
    const res = await acceptDuel(userId, body.duelId);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  } else {
    const ok = await declineDuel(userId, body.duelId);
    if (!ok) return NextResponse.json({ error: "Виклик не знайдено" }, { status: 404 });
  }

  // Баланс суперника потрібен, щоб не запропонувати ставку, яку він не тягне.
  const [duels, rivals, relief] = await Promise.all([
    listDuels(userId),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, coins: true },
      orderBy: { name: "asc" },
    }),
    getReliefStatus(userId),
  ]);
  return NextResponse.json({ duels, rivals, relief }, { status: 201 });
}
