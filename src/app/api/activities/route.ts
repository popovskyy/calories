import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AiError } from "@/lib/ai-error";
import { analyzeActivity } from "@/lib/gemini-activity";
import { evaluateMealRewards } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/activities?date= */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Потрібен date" }, { status: 400 });
  }

  const rows = await prisma.activityLog.findMany({
    where: { userId: auth.session.userId, date },
    // Найновіші зверху — так журнал читають частіше, ніж хронологічно.
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  caloriesBurned: z.number().int().nonnegative().max(5000).optional(),
  durationMin: z.number().int().nonnegative().max(24 * 60).nullable().optional(),
  apiKey: z.string().optional(),
});

/** POST /api/activities — зберегти активність (ШІ або ручні ккал) */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  let caloriesBurned = d.caloriesBurned;
  let durationMin = d.durationMin ?? null;
  let notes: string[] = [];

  if (caloriesBurned === undefined) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: auth.session.userId },
        select: { weight: true },
      });
      const ai = await analyzeActivity({
        description: d.description,
        weightKg: user?.weight,
        apiKey: d.apiKey,
      });
      caloriesBurned = ai.caloriesBurned;
      durationMin = ai.durationMin;
      notes = ai.notes;
    } catch (err) {
      if (err instanceof AiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "Помилка аналізу активності" }, { status: 502 });
    }
  }

  const row = await prisma.activityLog.create({
    data: {
      userId: auth.session.userId,
      date: d.date,
      description: d.description,
      caloriesBurned: caloriesBurned!,
      durationMin,
      status: "approved",
    },
  });

  // перерахунок in_target після спалених ккал
  const rewards = await evaluateMealRewards(auth.session.userId, d.date);

  return NextResponse.json({ ...row, notes, rewards }, { status: 201 });
}
