import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, readSessionToken } from "@/lib/session";

/**
 * Одноюзерний вхід: застосунок публічний у мережі й смикає платний Gemini, тож без воріт
 * будь-хто міг би палити квоту й міняти дані. Перевірка облікових даних — у lib/credentials.ts.
 */

export async function startSession(): Promise<void> {
  const token = await createSessionToken({ userId: "me", username: "athlete" });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return (await readSessionToken(token)) !== null;
}
