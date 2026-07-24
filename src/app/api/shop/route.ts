import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncArenaRewards } from "@/lib/rewards";
import { buildShop } from "@/lib/shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/shop — баланс + каталог скінів (спершу донараховує вчорашню арену) */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    await syncArenaRewards(auth.session.userId);
  } catch (e) {
    console.error("[shop] syncArenaRewards", e);
  }

  try {
    const shop = await buildShop(auth.session.userId);
    if (!shop) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }
    return NextResponse.json(shop);
  } catch (e) {
    console.error("[shop] buildShop", e);
    return NextResponse.json(
      { error: "Не вдалося завантажити магазин" },
      { status: 500 },
    );
  }
}
