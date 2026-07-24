import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/meals/recent?limit=12
 * Унікальні нещодавні страви (за описом) для швидкого повтору.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 30)
    : 12;

  const meals = await prisma.mealLog.findMany({
    where: { userId: auth.session.userId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      description: true,
      calories: true,
      protein: true,
      fats: true,
      carbs: true,
      createdAt: true,
    },
  });

  const seen = new Set<string>();
  const unique: typeof meals = [];
  for (const m of meals) {
    const key = m.description.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
    if (unique.length >= limit) break;
  }

  return NextResponse.json(unique);
}
