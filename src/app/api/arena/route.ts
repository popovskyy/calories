import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { shiftYMD, todayYMD } from "@/lib/date";
import { computeRanking } from "@/lib/arena";
import { ARENA_PRIZES, isArenaPayable } from "@/lib/economy";
import type { ArenaEntry, ArenaYesterdayEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Рейтинг за очками дня (див. dayScore) + пам'ять: топ-3 вчорашнього дня
 * з виплаченими монетами, щоб змагання мало вчорашній рахунок.
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

  // Вчорашній подіум: та сама математика, що в settleArenaDay (rewards.ts) —
  // поле = хто вів журнал їжі, призових місць удвічі менше за поле,
  // приз лише при точності ±15%.
  const yts = shiftYMD(today, -1);
  const yRanked = await computeRanking(yts);
  const field = yRanked.filter((e) => e.hasMeal);
  const slots = Math.min(ARENA_PRIZES.length, Math.floor(field.length / 2));
  const yesterday: ArenaYesterdayEntry[] = field.slice(0, 3).map((e, i) => {
    const accurate = isArenaPayable(e.todayCalories, e.targetCalories);
    return {
      rank: i + 1,
      userId: e.userId,
      name: e.name,
      avatarUrl: e.avatarUrl,
      score: e.score,
      coins: accurate && i < slots ? ARENA_PRIZES[i]! : 0,
      isMe: e.userId === auth.session.userId,
    };
  });

  return NextResponse.json({ date: today, entries, yesterday });
}
