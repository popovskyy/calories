import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { listEpics, startEpic } from "@/lib/epic-progress";
import { getEpic } from "@/lib/epics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/epics — усі хроніки з прогресом (авто-виплата досягнутих вузлів). */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await listEpics(auth.session.userId));
  } catch (e) {
    console.error("[epics] list", e);
    return NextResponse.json(
      { error: "Не вдалося завантажити хроніки" },
      { status: 500 },
    );
  }
}

const schema = z.object({ epicId: z.string().min(1) });

/** POST /api/epics — обрати активний епік. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані" }, { status: 400 });
  }

  const def = getEpic(parsed.data.epicId);
  if (!def) return NextResponse.json({ error: "Хроніку не знайдено" }, { status: 404 });
  if (def.contextual) {
    return NextResponse.json(
      { error: "Ця хроніка з'являється сама" },
      { status: 400 },
    );
  }

  await startEpic(auth.session.userId, def.id);
  return NextResponse.json(await listEpics(auth.session.userId), { status: 201 });
}
