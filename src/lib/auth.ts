import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, readSessionToken } from "@/lib/session";

/**
 * Одноюзерний вхід: застосунок публічний у мережі й смикає платний Gemini, тож
 * без воріт будь-хто міг би палити квоту й міняти дані. Облікові дані — ті самі
 * ADMIN_USERNAME / ADMIN_PASSWORD, що вже є в Vercel. Якщо env не задано — вхід
 * закритий (fail closed), жодних дефолтних паролів.
 */
const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME?.trim();
  const p = process.env.ADMIN_PASSWORD?.trim();
  if (!u || !p) return false;
  // sha256 вирівнює довжини → timingSafeEqual не кидає і не витікає довжину
  const okUser = timingSafeEqual(digest(username.trim()), digest(u));
  const okPass = timingSafeEqual(digest(password), digest(p));
  return okUser && okPass;
}

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
