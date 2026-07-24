import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminCredentials, setAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Введіть логін і пароль" }, { status: 400 });
  }

  const creds = adminCredentials();
  if (
    parsed.data.username !== creds.username ||
    parsed.data.password !== creds.password
  ) {
    return NextResponse.json({ error: "Невірний логін або пароль" }, { status: 401 });
  }

  await setAdminSession(creds.username);
  return NextResponse.json({ ok: true, username: creds.username });
}
