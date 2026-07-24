import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listQuestStatus } from "@/lib/quests";
import { weekStartYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/quests — квести поточного тижня + прогрес (авто-нарахування якщо виконано). */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const week = url.searchParams.get("week") || weekStartYMD();
  const data = await listQuestStatus(auth.session.userId, week);
  return NextResponse.json(data);
}
