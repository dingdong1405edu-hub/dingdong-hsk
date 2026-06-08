import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health")
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const { pathname } = nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  if (!session?.user) {
    // clone() keeps the basePath (/zh) so the redirect stays inside this zone
    const url = nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    const url = nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Exclude api so the auth middleware doesn't run on API/health routes under
  // basePath (/zh/api/health must return a clean 200 for the Railway healthcheck).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
