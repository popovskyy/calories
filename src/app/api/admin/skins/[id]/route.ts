import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nameUk: z.string().trim().min(1).max(64).optional(),
  tier: z.enum(["free", "premium"]).optional(),
  price: z.number().int().min(0).max(1_000_000).optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
  bg: z.string().min(1).max(32).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  artKind: z.enum(["builtin", "file", "inline"]).optional(),
  svg: z.string().max(200_000).nullable().optional(),
});

/** PATCH /api/admin/skins/:id — ціна / назва / увімкнення */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const existing = await prisma.skinDef.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Скін не знайдено" }, { status: 404 });
  }

  const d = parsed.data;
  const tier = d.tier ?? existing.tier;
  const artKind = d.artKind ?? existing.artKind;
  const svg = d.svg !== undefined ? d.svg : existing.svg;

  if (artKind === "inline" && !svg?.trim()) {
    return NextResponse.json({ error: "Для inline потрібен SVG" }, { status: 400 });
  }

  const row = await prisma.skinDef.update({
    where: { id },
    data: {
      ...(d.nameUk !== undefined ? { nameUk: d.nameUk } : {}),
      ...(d.tier !== undefined ? { tier: d.tier } : {}),
      ...(d.price !== undefined || d.tier !== undefined
        ? { price: tier === "free" ? 0 : (d.price ?? existing.price) }
        : {}),
      ...(d.rarity !== undefined ? { rarity: d.rarity } : {}),
      ...(d.bg !== undefined ? { bg: d.bg } : {}),
      ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.artKind !== undefined ? { artKind: d.artKind } : {}),
      ...(d.svg !== undefined ? { svg: d.svg } : {}),
    },
  });

  return NextResponse.json(row);
}

/** DELETE /api/admin/skins/:id — завжди soft-disable (інакше ensureSkinCatalog поверне дефолт). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.skinDef.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Скін не знайдено" }, { status: 404 });
  }

  const row = await prisma.skinDef.update({
    where: { id },
    data: { enabled: false },
  });
  return NextResponse.json(row);
}
