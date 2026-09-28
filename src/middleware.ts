import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (session?.stage === "full") {
    // Fully logged in: skip the login and authenticator pages.
    return pathname === "/admin/login" || pathname === "/admin/verify" ? go("/admin") : NextResponse.next();
  }
  if (session?.stage === "mfa") {
    // Password OK, authenticator code still needed.
    return pathname === "/admin/verify" || pathname === "/admin/login" ? NextResponse.next() : go("/admin/verify");
  }
  return pathname === "/admin/login" ? NextResponse.next() : go("/admin/login");
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
