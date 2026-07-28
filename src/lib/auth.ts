import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
} from "@/lib/session";
import { toUserDTO } from "@/lib/user-dto";
import type { UserDTO } from "@/lib/types";

export {
  SESSION_COOKIE,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
} from "@/lib/session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function getSessionUser(): Promise<UserDTO | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });
  if (!user) return null;
  return toUserDTO(user);
}

/** Причина за замовчуванням — коли адмін заблокував без пояснення. */
export const BLOCKED_FALLBACK_REASON =
  "Адміністратор призупинив доступ до акаунта";

export async function requireSession(opts?: {
  /** Дозволити сесію без апруву (logout / me / password). */
  allowPending?: boolean;
}): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Потрібен вхід" }, { status: 401 }),
    };
  }

  if (!opts?.allowPending) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { approved: true, blockedAt: true, blockReason: true },
    });
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Потрібен вхід" }, { status: 401 }),
      };
    }
    // Блокування перевіряємо першим: якщо адмін закрив доступ уже після
    // підтвердження, людині треба сказати саме це, а не «очікуйте апруву».
    if (user.blockedAt) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: user.blockReason?.trim() || BLOCKED_FALLBACK_REASON,
            code: "BLOCKED",
          },
          { status: 403 },
        ),
      };
    }
    if (!user.approved) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Акаунт очікує підтвердження адміністратора",
            code: "PENDING_APPROVAL",
          },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, session };
}
