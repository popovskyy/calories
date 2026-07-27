import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/activities/recent?limit=10
 * Унікальні нещодавні активності (за описом) для швидкого повтору —
 * дзеркало /api/meals/recent.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 30)
    : 10;

  const acts = await prisma.activityLog.findMany({
    where: { userId: auth.session.userId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      description: true,
      caloriesBurned: true,
      durationMin: true,
      createdAt: true,
    },
  });

  const seen = new Set<string>();
  const unique: typeof acts = [];
  for (const a of acts) {
    const key = a.description.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(a);
    if (unique.length >= limit) break;
  }

  return NextResponse.json(unique);
}
