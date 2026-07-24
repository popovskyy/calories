import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/admin/login",
  "/api/admin/login",
  "/api/skins/catalog",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/mascots") ||
    pathname.startsWith("/api/skins/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // --- Admin zone ---
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  if (isAdminPage || isAdminApi) {
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }
    const adminToken = req.cookies.get(ADMIN_COOKIE)?.value;
    const adminSession = adminToken ? await readSessionToken(adminToken) : null;
    const isAdmin =
      !!adminSession?.username?.startsWith("admin:");

    if (!isAdmin) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Потрібен вхід адміна" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- App user zone ---
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token) : null;

  if (!session && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Потрібен вхід" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
