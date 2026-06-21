import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { getEntitlements } from "@/lib/entitlements";
import { effectiveHearts } from "@/lib/hearts";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      xp: true,
      hearts: true,
      heartsUpdatedAt: true,
      streakDays: true,
      role: true,
      hskLevel: true,
    },
  });
  if (!user) redirect("/login");

  const ent = await getEntitlements(user.id, user.role);
  // Người trả phí/admin: tim không giới hạn. Người miễn phí: hiện số tim đã hồi.
  const heartsDisplay = ent.unlimitedHearts
    ? user.hearts
    : effectiveHearts(user.hearts, user.heartsUpdatedAt);

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        xp: user.xp,
        hearts: heartsDisplay,
        unlimitedHearts: ent.unlimitedHearts,
        streakDays: user.streakDays,
        role: user.role,
        hskLevel: user.hskLevel,
      }}
    >
      {children}
    </DashboardShell>
  );
}
