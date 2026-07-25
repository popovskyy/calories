import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { clearThemeCookie } from "@/lib/theme-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  await clearThemeCookie();
  return NextResponse.json({ ok: true });
}
