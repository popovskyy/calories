import { NextResponse } from "next/server";
import { listSkins } from "@/lib/skin-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/skins/catalog — публічний увімкнений каталог (реєстрація / пікер). */
export async function GET() {
  const skins = await listSkins({ enabledOnly: true });
  return NextResponse.json(
    skins.map((s) => ({
      id: s.id,
      nameUk: s.nameUk,
      tier: s.tier,
      price: s.price,
      rarity: s.rarity,
      bg: s.bg,
      artKind: s.artKind,
    })),
  );
}
