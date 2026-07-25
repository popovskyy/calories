import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme-constants";

export { THEME_COOKIE };

/** Server-only: пише куку теми через next/headers. */
export async function setThemeCookie(theme: string) {
  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearThemeCookie() {
  const jar = await cookies();
  jar.delete(THEME_COOKIE);
}
