"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  BookOpen,
  SpellCheck,
  PenTool,
  BookText,
  Headphones,
  PenLine,
  Mic,
  Shield,
} from "lucide-react";
import { cn, hskLevelLabel } from "@/lib/utils";

export const LEARN_NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/vocab", label: "Từ vựng", icon: BookOpen },
  { href: "/grammar", label: "Ngữ pháp", icon: SpellCheck },
  { href: "/hanzi", label: "Chữ Hán", icon: PenTool },
  { href: "/reading", label: "Đọc hiểu", icon: BookText },
  { href: "/listening", label: "Nghe hiểu", icon: Headphones },
  { href: "/writing", label: "Viết luận", icon: PenLine },
  { href: "/speaking", label: "Luyện nói", icon: Mic },
];

interface SidebarUser {
  role: string;
  hskLevel: string;
}

function NavContent({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xl">🔔</div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold text-primary">DingDong</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            HSK Learning
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Học tập
        </p>
        {LEARN_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}

        {user.role === "ADMIN" && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Quản trị
            </p>
            <Link
              href="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Shield className="h-[18px] w-[18px] shrink-0" />
              Trang quản trị
            </Link>
          </>
        )}
      </nav>

      {/* HSK level card */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary/10 to-amber-100/50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base shadow-sm">🎓</div>
          <div className="leading-tight">
            <div className="text-[11px] text-muted-foreground">Cấp độ mục tiêu</div>
            <div className="text-sm font-bold text-primary">{hskLevelLabel(user.hskLevel)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  user,
  mobileOpen,
  onClose,
}: {
  user: SidebarUser;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden border-r bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
        <NavContent user={user} />
      </aside>

      {/* Mobile: slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[82%] bg-card shadow-2xl">
            <button
              onClick={onClose}
              aria-label="Đóng menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent user={user} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
