import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [
  "/wallet",
  "/decide",
  "/dashboard",
  "/cards",
  "/rules",
  "/proxy",
  "/pay",
  "/transactions",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const session = req.cookies.get("routely_session");
  if (!session?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wallet/:path*",
    "/decide/:path*",
    "/dashboard/:path*",
    "/cards/:path*",
    "/rules/:path*",
    "/proxy/:path*",
    "/pay/:path*",
    "/transactions/:path*",
    "/settings/:path*",
  ],
};
