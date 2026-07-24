import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { analyzeFood, GeminiError } from "@/lib/gemini";
import type { AnalyzeResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const analyzeSchema = z
  .object({
    description: z.string().optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
    apiKey: z.string().optional(),
  })
  .refine((d) => !!d.description?.trim() || !!d.imageBase64, {
    message: "Потрібен опис страви або фото",
  });

/** POST /api/meals/analyze — лише ШІ-аналіз, без збереження */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  try {
    const result: AnalyzeResult = await analyzeFood(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Помилка аналізу страви" }, { status: 502 });
  }
}
