import { NextResponse } from "next/server";
import { getSkinDef } from "@/lib/skin-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/skins/:id/svg — віддає inline SVG з каталогу */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const skin = await getSkinDef(id);
  if (!skin || !skin.enabled || skin.artKind !== "inline" || !skin.svg) {
    return NextResponse.json({ error: "Немає SVG" }, { status: 404 });
  }
  return new NextResponse(skin.svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
