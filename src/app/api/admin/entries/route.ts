import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { humanDate } from "@/lib/date";
import { notifyUser } from "@/lib/push";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clip(s: string, n = 40): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

/** GET /api/admin/entries — останні прийоми + активності для модерації */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") || "40", 10) || 40,
    100,
  );
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;

  const mealWhere = {
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
  };
  const actWhere = {
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
  };

  const [meals, activities] = await Promise.all([
    prisma.mealLog.findMany({
      where: mealWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: actWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    }),
  ]);

  const entries = [
    ...meals.map((m) => ({
      kind: "meal" as const,
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      username: m.user.username,
      date: m.date,
      description: m.description,
      calories: m.calories,
      protein: m.protein,
      fats: m.fats,
      carbs: m.carbs,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
    })),
    ...activities.map((a) => ({
      kind: "activity" as const,
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      username: a.user.username,
      date: a.date,
      description: a.description,
      calories: a.caloriesBurned,
      durationMin: a.durationMin,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json(entries.slice(0, limit));
}

const patchSchema = z.object({
  kind: z.enum(["meal", "activity"]),
  id: z.string().min(1),
  action: z.enum(["approve", "cancel", "update"]),
  description: z.string().trim().min(1).max(500).optional(),
  calories: z.number().int().min(0).max(50_000).optional(),
  protein: z.number().int().min(0).max(5_000).optional(),
  fats: z.number().int().min(0).max(5_000).optional(),
  carbs: z.number().int().min(0).max(5_000).optional(),
  durationMin: z.number().int().min(0).max(24 * 60).nullable().optional(),
});

/**
 * PATCH — approve / cancel / update калорій запису.
 * За замовчуванням усі записи approved; адмін може скасувати або підправити.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (d.kind === "meal") {
    const existing = await prisma.mealLog.findUnique({ where: { id: d.id } });
    if (!existing) {
      return NextResponse.json({ error: "Запис не знайдено" }, { status: 404 });
    }
    if (d.action === "cancel") {
      const row = await prisma.mealLog.update({
        where: { id: d.id },
        data: { status: "cancelled" },
      });
      void notifyUser(existing.userId, {
        kind: "entry_cancelled",
        title: "Раціон не підтверджено",
        body: `Адмін скасував запис «${clip(existing.description)}» (${existing.calories} ккал) за ${humanDate(existing.date)}. Загляньте в журнал.`,
        url: `/log?date=${existing.date}`,
        dedupeKey: null,
      }).catch(console.error);
      return NextResponse.json(row);
    }
    if (d.action === "approve") {
      const row = await prisma.mealLog.update({
        where: { id: d.id },
        data: { status: "approved" },
      });
      return NextResponse.json(row);
    }
    const nextDesc = d.description ?? existing.description;
    const nextCal = d.calories ?? existing.calories;
    const changed =
      nextDesc !== existing.description || nextCal !== existing.calories;
    const row = await prisma.mealLog.update({
      where: { id: d.id },
      data: {
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.calories !== undefined ? { calories: d.calories } : {}),
        ...(d.protein !== undefined ? { protein: d.protein } : {}),
        ...(d.fats !== undefined ? { fats: d.fats } : {}),
        ...(d.carbs !== undefined ? { carbs: d.carbs } : {}),
        status: "approved",
      },
    });
    if (changed) {
      void notifyUser(existing.userId, {
        kind: "entry_updated",
        title: "Запис відкориговано",
        body: `Адмін уточнив «${clip(nextDesc)}»: тепер ${nextCal} ккал замість ${existing.calories}. Підсумок дня оновлено.`,
        url: `/log?date=${existing.date}`,
        dedupeKey: null,
      }).catch(console.error);
    }
    return NextResponse.json(row);
  }

  const existing = await prisma.activityLog.findUnique({ where: { id: d.id } });
  if (!existing) {
    return NextResponse.json({ error: "Запис не знайдено" }, { status: 404 });
  }
  if (d.action === "cancel") {
    const row = await prisma.activityLog.update({
      where: { id: d.id },
      data: { status: "cancelled" },
    });
    void notifyUser(existing.userId, {
      kind: "entry_cancelled",
      title: "Тренування не зараховано",
      body: `Адмін скасував активність «${clip(existing.description)}» (−${existing.caloriesBurned} ккал) за ${humanDate(existing.date)}. Норму дня перераховано.`,
      url: `/log?date=${existing.date}`,
      dedupeKey: null,
    }).catch(console.error);
    return NextResponse.json(row);
  }
  if (d.action === "approve") {
    const row = await prisma.activityLog.update({
      where: { id: d.id },
      data: { status: "approved" },
    });
    return NextResponse.json(row);
  }
  const nextDesc = d.description ?? existing.description;
  const nextCal = d.calories ?? existing.caloriesBurned;
  const changed =
    nextDesc !== existing.description || nextCal !== existing.caloriesBurned;
  const row = await prisma.activityLog.update({
    where: { id: d.id },
    data: {
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.calories !== undefined ? { caloriesBurned: d.calories } : {}),
      ...(d.durationMin !== undefined ? { durationMin: d.durationMin } : {}),
      status: "approved",
    },
  });
  if (changed) {
    void notifyUser(existing.userId, {
      kind: "entry_updated",
      title: "Активність відкориговано",
      body: `Адмін уточнив «${clip(nextDesc)}»: тепер −${nextCal} ккал замість −${existing.caloriesBurned}.`,
      url: `/log?date=${existing.date}`,
      dedupeKey: null,
    }).catch(console.error);
  }
  return NextResponse.json(row);
}
