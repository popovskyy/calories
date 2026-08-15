import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeStreak } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats/streak — стрік поточного користувача */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const result = await computeStreak(auth.session.userId);
  return NextResponse.json(result);
}
