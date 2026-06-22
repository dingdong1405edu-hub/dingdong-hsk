import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Authorization guard for server-side admin operations.
 *
 * MUST be called at the very top of EVERY admin server action. The admin
 * layout gate (src/app/admin/layout.tsx) only protects page *navigations* — a
 * server action is a globally-addressable POST endpoint that a non-admin user
 * can replay from any route they are allowed on (e.g. /dashboard), so the
 * layout is not a defense for the action itself. Each action must enforce
 * authorization on its own.
 *
 * The role is read FRESH from the database (not from the JWT). The JWT only
 * refreshes `role` at sign-in (src/lib/auth.config.ts), so a user that was just
 * promoted to ADMIN — e.g. a sub-admin granted from /admin/users — would
 * otherwise have to log out and back in before any admin action accepted them.
 * Re-reading here costs one indexed lookup per admin action (negligible) and
 * makes the DB the single source of truth for authorization.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}
