import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prismaError, validationError } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { questCreateSchema } from "@/lib/quest-schema";
import { ensureWeekQuests, QUEST_POOL } from "@/lib/quests";
import { weekStartYMD } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/quests?week=YYYY-MM-DD */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("week") || weekStartYMD();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "Невалідний тиждень" }, { status: 400 });
  }

  try {
    await ensureWeekQuests(weekStart);
    const quests = await prisma.weeklyQuest.findMany({
      where: { weekStart },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    return NextResponse.json({ weekStart, quests, pool: QUEST_POOL });
  } catch (err) {
    return prismaError(err);
  }
}

/** POST /api/admin/quests — додати квест на тиждень */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = questCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

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
  } catch (err) {
    return prismaError(err, {
      unique: `Квест з кодом «${d.code}» уже є на цьому тижні`,
    });
  }
}
