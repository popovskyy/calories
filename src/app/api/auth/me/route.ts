import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  // Без кешу — баланс монет завжди свіжий (адмінка може нарахувати)
  return NextResponse.json(user, {
    headers: { "Cache-Control": "no-store" },
  });
}
