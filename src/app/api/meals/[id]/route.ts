import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/meals/:id — лише свої записи */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const meal = await prisma.mealLog.findUnique({ where: { id } });
  if (!meal || meal.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Запис не знайдено" }, { status: 404 });
  }
  await prisma.mealLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
