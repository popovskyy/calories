import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SKIN_ID_RE } from "@/lib/avatar-presets";
import { ensureSkinCatalog, listSkins } from "@/lib/skin-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const skinBody = z.object({
  id: z.string().regex(SKIN_ID_RE, "id: латиниця, цифри, _ (макс 32)"),
  nameUk: z.string().trim().min(1).max(64),
  tier: z.enum(["free", "premium"]),
  price: z.number().int().min(0).max(1_000_000),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  bg: z.string().min(1).max(32),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  artKind: z.enum(["builtin", "file", "inline"]),
  svg: z.string().max(200_000).nullable().optional(),
});

/** GET /api/admin/skins — повний каталог */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const skins = await listSkins();
  return NextResponse.json(skins);
}

/** POST /api/admin/skins — новий скін */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await ensureSkinCatalog();
  const body = await req.json().catch(() => null);
  const parsed = skinBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  if (d.artKind === "inline" && !d.svg?.trim()) {
    return NextResponse.json({ error: "Для inline потрібен SVG" }, { status: 400 });
  }

  const price = d.tier === "free" ? 0 : d.price;

  try {
    const row = await prisma.skinDef.create({
      data: {
        id: d.id,
        nameUk: d.nameUk,
        tier: d.tier,
        price,
        rarity: d.rarity,
        bg: d.bg,
        enabled: d.enabled ?? true,
        sortOrder: d.sortOrder ?? 500,
        artKind: d.artKind,
        svg: d.artKind === "inline" ? d.svg! : null,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Такий id уже є" }, { status: 409 });
  }
}
