import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kinds = [
  "in_target_days",
  "log_days",
  "activity_days",
  "dual_days",
  "no_blowout",
  "weekend_clean",
] as const;

const patchSchema = z.object({
  titleUk: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(280).optional(),
  kind: z.enum(kinds).optional(),
  target: z.number().int().min(1).max(7).optional(),
  rewardCoins: z.number().int().min(0).max(5000).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});

/** PATCH /api/admin/quests/:id */
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

  try {
    const row = await prisma.weeklyQuest.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Квест не знайдено" }, { status: 404 });
  }
}

/** DELETE /api/admin/quests/:id — вимкнути */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const row = await prisma.weeklyQuest.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Квест не знайдено" }, { status: 404 });
  }
}
