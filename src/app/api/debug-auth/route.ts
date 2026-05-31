import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__Secure-authjs.session-token")?.value?.substring(0, 30);
  return NextResponse.json({
    session,
    hasUser: !!session?.user,
    cookieExists: !!sessionCookie,
    cookiePrefix: sessionCookie,
  });
}
