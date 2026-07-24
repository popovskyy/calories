import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ensureWeekQuests, QUEST_POOL } from "@/lib/quests";
import { weekStartYMD } from "@/lib/date";

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

const createSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  code: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/),
  titleUk: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(280),
  kind: z.enum(kinds),
  target: z.number().int().min(1).max(7),
  rewardCoins: z.number().int().min(0).max(5000),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});

/** GET /api/admin/quests?week=YYYY-MM-DD */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("week") || weekStartYMD();
  await ensureWeekQuests(weekStart);
  const quests = await prisma.weeklyQuest.findMany({
    where: { weekStart },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ weekStart, quests, pool: QUEST_POOL });
}

/** POST /api/admin/quests — додати квест на тиждень */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const weekStart = d.weekStart ?? weekStartYMD();
  try {
    const row = await prisma.weeklyQuest.create({
      data: {
        weekStart,
        code: d.code,
        titleUk: d.titleUk,
        description: d.description,
        kind: d.kind,
        target: d.target,
        rewardCoins: d.rewardCoins,
        sortOrder: d.sortOrder ?? 100,
        active: d.active ?? true,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Такий code уже є на цей тиждень" }, { status: 409 });
  }
}
