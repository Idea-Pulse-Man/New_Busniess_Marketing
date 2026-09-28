import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = PUBLIC_ADMIN_PATHS.includes(pathname);
  const admin = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!admin && !isAuthPage) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (admin && isAuthPage) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
