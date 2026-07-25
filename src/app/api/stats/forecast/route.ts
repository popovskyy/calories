import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeForecast } from "@/lib/forecast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const forecast = await computeForecast(auth.session.userId);
  return NextResponse.json(forecast);
}
