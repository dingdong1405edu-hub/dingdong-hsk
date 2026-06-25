"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import {
  X,
  LayoutDashboard,
  Route,
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
  BookMarked,
  Users2,
  UserRound,
  MessageCircleHeart,
  Crown,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn, hskLevelLabel } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/roadmap", label: "Lộ trình", icon: Route },
      { href: "/goals", label: "Mục tiêu", icon: Target },
    ],
  },
  {
    title: "Luyện kỹ năng",
    items: [
      { href: "/vocab", label: "Từ vựng", icon: BookOpen },
      { href: "/grammar", label: "Ngữ pháp", icon: SpellCheck },
      { href: "/hanzi", label: "Chữ cái & phát âm", icon: PenTool },
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
      { href: "/so-tu", label: "Sổ từ", icon: BookMarked },
    ],
  },
  {
    title: "Khác",
    items: [
      { href: "/community", label: "Cộng đồng", icon: Users2 },
      { href: "/profile", label: "Hồ sơ", icon: UserRound },
      { href: "/lien-he", label: "Liên hệ & Góp ý", icon: MessageCircleHeart },
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <>
          <motion.span
            layoutId="nav-active"
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="absolute inset-0 rounded-lg bg-primary/10"
          />
          <motion.span
            layoutId="nav-active-bar"
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
          />
        </>
      )}
      <Icon className="relative z-10 h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
      <span className="relative z-10">{item.label}</span>
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
      <Link href="/" className="flex h-16 items-center gap-2.5 border-b px-5" aria-label="DingDong HSK — về trang chủ">
        <Logo className="h-9 w-9" />
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
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {pathname.startsWith("/admin") && (
                <>
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-primary/10"
                  />
                  <motion.span
                    layoutId="nav-active-bar"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                  />
                </>
              )}
              <Shield className="relative z-10 h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
              <span className="relative z-10">Trang quản trị</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom cards */}
      <div className="space-y-2 border-t p-3">
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-1.5">
          <span className="text-[12px] font-semibold text-muted-foreground">Giao diện</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-500/15 dark:to-amber-500/5 p-2.5 ring-1 ring-amber-100 dark:ring-amber-400/25">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-card text-amber-500 shadow-sm">
            <Crown className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold text-amber-700 dark:text-amber-300">Premium</div>
            <div className="text-[10px] text-amber-700/70 dark:text-amber-300/70">Mở khoá toàn bộ bài học</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary/10 to-green-100/60 dark:to-green-500/10 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-card text-base shadow-sm">🎓</div>
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
      <aside className="hidden border-r bg-card/80 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
        <LayoutGroup id="sb-desktop">
          <NavContent user={user} />
        </LayoutGroup>
      </aside>

      {/* Mobile: slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 max-w-[82%] bg-card shadow-2xl">
            <button
              onClick={onClose}
              aria-label="Đóng menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <LayoutGroup id="sb-mobile">
              <NavContent user={user} onNavigate={onClose} />
            </LayoutGroup>
          </aside>
        </div>
      )}
    </>
  );
}
