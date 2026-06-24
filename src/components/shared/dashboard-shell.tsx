"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Ambient } from "@/components/motion/ambient";
import { ChatWidget } from "@/components/chat/chat-widget";

interface ShellUser {
  name?: string | null;
  email: string;
  image?: string | null;
  xp: number;
  hearts: number;
  unlimitedHearts: boolean;
  streakDays: number;
  role: string;
  hskLevel: string;
}

export function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      {/* Peaceful ambient backdrop (fixed, behind all content) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-muted/20">
        <div className="peaceful-bg absolute inset-0" />
        <Ambient variant="calm" />
      </div>

      <Sidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <Topbar user={user} onMenu={() => setMobileOpen(true)} />
        <main
          key={pathname}
          className="animate-fade-up mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>

      {/* Trợ lý AI "Bao" — bong bóng nổi trên mọi trang khu vực học */}
      <ChatWidget userName={user.name} />
    </div>
  );
}
