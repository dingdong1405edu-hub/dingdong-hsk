import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;

  // Debug endpoint - return auth state as JSON
  if (pathname === "/api/debug-auth") {
    return NextResponse.json({
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || null,
      role: session?.user?.role || null,
      cookies: [...req.cookies.getAll().map(c => c.name)],
    });
  }

  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/debug");

  if (isPublic) return NextResponse.next();

  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
