import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prismaError, validationError } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { questPatchSchema } from "@/lib/quest-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/quests/:id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const row = await prisma.weeklyQuest.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Квест не знайдено" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    return prismaError(err);
  }
}

/** PATCH /api/admin/quests/:id */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = questPatchSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const row = await prisma.weeklyQuest.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(row);
  } catch (err) {
    return prismaError(err, { notFound: "Квест не знайдено" });
  }
}

/**
 * DELETE /api/admin/quests/:id
 * За замовчуванням — м'яке вимкнення (active:false): нагороди вже видані за
 * кодом квесту, тож рядок лишається як історія тижня.
 * ?hard=1 — повне видалення рядка.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const hard = new URL(req.url).searchParams.get("hard") === "1";

  try {
    if (hard) {
      const row = await prisma.weeklyQuest.delete({ where: { id } });
      return NextResponse.json({ ...row, deleted: true });
    }
    const row = await prisma.weeklyQuest.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json(row);
  } catch (err) {
    return prismaError(err, { notFound: "Квест не знайдено" });
  }
}
