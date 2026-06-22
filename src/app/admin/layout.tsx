import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/dashboard");

  // Read role FRESH from the DB, not the JWT — a just-promoted sub-admin would
  // otherwise be bounced from /admin until their next login (the JWT only picks
  // up role changes at sign-in). Matches requireAdmin() in src/lib/admin-guard.ts.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const name = session.user.name ?? session.user.email ?? "Admin";

  return <AdminShell userName={name}>{children}</AdminShell>;
}
