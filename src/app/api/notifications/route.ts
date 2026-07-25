import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notifications — список + лічильник непрочитаних. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        url: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({
    items: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    unreadCount,
  });
}

/** PATCH /api/notifications — позначити як прочитані (ids[] або all=true). */
export async function PATCH(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const userId = auth.session.userId;

  if (body?.all === true) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(body?.ids) && body.ids.length > 0) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: body.ids as string[] } },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
