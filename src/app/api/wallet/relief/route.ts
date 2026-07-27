import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { claimRelief, getReliefStatus } from "@/lib/relief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wallet/relief — чи доступні підйомні. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  return NextResponse.json(await getReliefStatus(auth.session.userId));
}

/** POST /api/wallet/relief — забрати підйомні з фонду. */
export async function POST() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const res = await claimRelief(auth.session.userId);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 409 });
  }

  return NextResponse.json({
    granted: res.granted,
    status: await getReliefStatus(auth.session.userId),
  });
}
