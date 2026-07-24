import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { todayYMD } from "@/lib/date";
import { computeRanking } from "@/lib/arena";
import type { ArenaEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Рейтинг за близькістю до особистої норми:
 * менший |зʼїдене − ціль| = вище. Без логу за день — в кінці.
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const today = todayYMD();
  const ranked = await computeRanking(today);
  const entries: ArenaEntry[] = ranked.map((e) => ({
    ...e,
    isMe: e.userId === auth.session.userId,
  }));

  return NextResponse.json({ date: today, entries });
}
