import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listDailyCards } from "@/lib/daily-cards";
import { todayYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/daily-cards — дві картки дня + прогрес (авто-нарахування). */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayYMD();

  try {
    const data = await listDailyCards(auth.session.userId, date);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[daily-cards] list", e);
    return NextResponse.json(
      { error: "Не вдалося завантажити картки дня" },
      { status: 500 },
    );
  }
}
