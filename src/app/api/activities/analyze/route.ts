import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AiError } from "@/lib/ai-error";
import { analyzeActivity } from "@/lib/gemini-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  description: z.string().min(1).max(500),
  apiKey: z.string().optional(),
});

/** POST /api/activities/analyze — лише оцінка ШІ, без збереження */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Потрібен опис" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: { weight: true },
    });
    const result = await analyzeActivity({
      description: parsed.data.description,
      weightKg: user?.weight,
      apiKey: parsed.data.apiKey,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Помилка аналізу" }, { status: 502 });
  }
}
