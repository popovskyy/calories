import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { GeminiError } from "@/lib/gemini";
import { generateMascotAvatar } from "@/lib/gemini-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  imageBase64: z.string().min(32, "Потрібне фото"),
  imageMimeType: z.string().optional(),
  apiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  try {
    const avatarUrl = await generateMascotAvatar(parsed.data);
    return NextResponse.json({ avatarUrl });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Помилка генерації аватара";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
