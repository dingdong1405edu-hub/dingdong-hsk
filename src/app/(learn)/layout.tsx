import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NavBar } from "@/components/shared/nav-bar";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, xp: true, hearts: true, streakDays: true, role: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <NavBar
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          xp: user.xp,
          hearts: user.hearts,
          streakDays: user.streakDays,
          role: user.role,
        }}
      />
      <main className="container py-6 max-w-6xl">{children}</main>
    </div>
  );
}
