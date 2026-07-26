import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wallet — історія руху монет. Раніше витрати ніде не фіксувались. */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(200, Number(url.searchParams.get("limit")) || 60);

  const [user, txns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: { coins: true },
    }),
    prisma.coinTxn.findMany({
      where: { userId: auth.session.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, delta: true, kind: true, label: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    coins: user?.coins ?? 0,
    txns: txns.map((t) => ({
      id: t.id,
      delta: t.delta,
      kind: t.kind,
      label: t.label,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
