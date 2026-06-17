import { auth } from "@/lib/auth";

/**
 * Authorization guard for server-side admin operations.
 *
 * MUST be called at the very top of EVERY admin server action. The admin
 * layout gate (src/app/admin/layout.tsx) only protects page *navigations* — a
 * server action is a globally-addressable POST endpoint that a non-admin user
 * can replay from any route they are allowed on (e.g. /dashboard), so the
 * layout is not a defense for the action itself. Each action must enforce
 * authorization on its own.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}
