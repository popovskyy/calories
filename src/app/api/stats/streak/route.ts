import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeStreak, settleShields, syncStreakCounters } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats/streak — стрік поточного користувача */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // Щит має спрацювати ДО показу: побачити обнулений лічильник, маючи щит
  // в інвентарі, — найгірше, що може статися з цією механікою.
  await settleShields(auth.session.userId);

  const result = await computeStreak(auth.session.userId);
  await syncStreakCounters(auth.session.userId, result.streak);
  return NextResponse.json(result);
}
