"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  Target,
  BookOpen,
  SpellCheck,
  PenTool,
  BookText,
  Headphones,
  PenLine,
  Mic,
  GraduationCap,
  Library,
  Users2,
  UserRound,
  Crown,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn, hskLevelLabel } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}
interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Trang chủ", icon: Home, exact: true },
      { href: "/goals", label: "Mục tiêu", icon: Target },
    ],
  },
  {
    title: "Luyện kỹ năng",
    items: [
      { href: "/vocab", label: "Từ vựng", icon: BookOpen },
      { href: "/grammar", label: "Ngữ pháp", icon: SpellCheck },
      { href: "/hanzi", label: "Chữ Hán", icon: PenTool },
      { href: "/reading", label: "Đọc hiểu", icon: BookText },
      { href: "/listening", label: "Nghe hiểu", icon: Headphones },
      { href: "/writing", label: "Viết luận", icon: PenLine },
      { href: "/speaking", label: "Luyện nói", icon: Mic },
    ],
  },
  {
    title: "Luyện thi & Tài liệu",
    items: [
      { href: "/exam", label: "Thi thử", icon: GraduationCap },
      { href: "/materials", label: "Tài liệu", icon: Library },
    ],
  },
  {
    title: "Khác",
    items: [
      { href: "/community", label: "Cộng đồng", icon: Users2 },
      { href: "/profile", label: "Hồ sơ", icon: UserRound },
    ],
  },
];

interface SidebarUser {
  role: string;
  hskLevel: string;
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
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
      {item.label}
    </Link>
  );
}

function NavContent({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link href="/dashboard" className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-sm">
          中
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold text-primary">DingDong HSK</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Học tiếng Trung
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}

        {user.role === "ADMIN" && (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Quản trị
            </p>
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {pathname.startsWith("/admin") && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Shield className="h-[18px] w-[18px] shrink-0" />
              Trang quản trị
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom cards */}
      <div className="space-y-2 border-t p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 p-2.5 ring-1 ring-amber-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-amber-500 shadow-sm">
            <Crown className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold text-amber-700">Premium</div>
            <div className="text-[10px] text-amber-700/70">Mở khoá toàn bộ bài học</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary/10 to-rose-100/50 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base shadow-sm">🎓</div>
          <div className="leading-tight">
            <div className="text-[10px] text-muted-foreground">Cấp độ mục tiêu</div>
            <div className="text-[13px] font-bold text-primary">{hskLevelLabel(user.hskLevel)}</div>
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
