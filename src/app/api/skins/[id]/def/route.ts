import { NextResponse } from "next/server";
import { getSkinDef } from "@/lib/skin-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/skins/:id/def — мінімальне DTO для клієнта:
 * щоб builtin-скіни могли показувати актуальний bg з БД.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const skin = await getSkinDef(id);
  if (!skin) {
    return NextResponse.json({ error: "Скін не знайдено" }, { status: 404 });
  }

  return NextResponse.json(
    {
      bg: skin.bg,
      artKind: skin.artKind,
      enabled: skin.enabled ?? true,
    },
    { status: 200 },
  );
}

