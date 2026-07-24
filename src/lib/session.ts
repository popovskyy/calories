import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "calories_session";
export const SESSION_DAYS = 30;

export type SessionPayload = {
  userId: string;
  username: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET не задано або занадто короткий (мін. 16 символів)",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function readSessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const username =
      typeof payload.username === "string" ? payload.username : null;
    if (!userId || !username) return null;
    return { userId, username };
  } catch {
    return null;
  }
}
