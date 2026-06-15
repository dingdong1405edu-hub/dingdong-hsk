import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/shared/dashboard-shell";

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
      streakDays: true,
      role: true,
      hskLevel: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        xp: user.xp,
        hearts: user.hearts,
        streakDays: user.streakDays,
        role: user.role,
        hskLevel: user.hskLevel,
      }}
    >
      {children}
    </DashboardShell>
  );
}
