import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  description: z.string().trim().min(1).max(500).optional(),
  caloriesBurned: z.number().int().min(0).max(5000).optional(),
  durationMin: z.number().int().min(0).max(24 * 60).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const row = await prisma.activityLog.findUnique({ where: { id } });
  if (!row || row.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }
  if (row.status === "cancelled") {
    return NextResponse.json({ error: "Запис скасовано адміном" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const updated = await prisma.activityLog.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const row = await prisma.activityLog.findUnique({ where: { id } });
  if (!row || row.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }
  await prisma.activityLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
