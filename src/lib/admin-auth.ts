import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  readSessionToken,
  SESSION_DAYS,
  type SessionPayload,
} from "@/lib/session";

export const ADMIN_COOKIE = "calories_admin_session";

export function adminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME?.trim() || "admin",
    password: process.env.ADMIN_PASSWORD?.trim() || "admin123",
  };
}

export async function setAdminSession(username: string) {
  const token = await createSessionToken({
    userId: "admin",
    username: `admin:${username}`,
  });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session?.username?.startsWith("admin:")) return null;
  return session;
}

export async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Потрібен вхід адміна" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}
