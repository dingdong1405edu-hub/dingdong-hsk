"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  SpellCheck,
  PenTool,
  BookText,
  Headphones,
  PenLine,
  Mic,
  MessagesSquare,
  GraduationCap,
  Library,
  Users,
  CreditCard,
  Flag,
  Inbox,
  ArrowLeft,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}
interface AdminNavGroup {
  title?: string;
  items: AdminNavItem[];
}

const GROUPS: AdminNavGroup[] = [
  { items: [{ href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true }] },
  {
    title: "Nội dung",
    items: [
      { href: "/admin/vocab", label: "Từ vựng", icon: BookOpen },
      { href: "/admin/grammar", label: "Ngữ pháp", icon: SpellCheck },
      { href: "/admin/hanzi", label: "Chữ Hán", icon: PenTool },
      { href: "/admin/reading", label: "Đọc hiểu", icon: BookText },
      { href: "/admin/listening", label: "Nghe hiểu", icon: Headphones },
      { href: "/admin/writing", label: "Viết luận", icon: PenLine },
      { href: "/admin/speaking", label: "Luyện nói", icon: Mic, exact: true },
      { href: "/admin/speaking/topics", label: "Nói theo chủ đề", icon: MessagesSquare },
      { href: "/admin/exam", label: "Thi thử", icon: GraduationCap },
      { href: "/admin/materials", label: "Tài liệu", icon: Library },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/users", label: "Người dùng", icon: Users },
      { href: "/admin/subscriptions", label: "Gói & quyền lợi", icon: CreditCard },
      { href: "/admin/word-reports", label: "Phản ánh từ", icon: Flag },
      { href: "/admin/feedback", label: "Góp ý & Liên hệ", icon: Inbox },
    ],
  },
];

function NavBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (item: AdminNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex h-16 items-center gap-2.5 border-b px-5" aria-label="DingDong HSK — về trang chủ">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold text-primary">Quản trị</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">DingDong HSK</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-[18px] w-[18px]" /> Về trang học
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
        <NavBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[82%] bg-card shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <NavBody pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <button className="-ml-1 rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Mở menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Chế độ quản trị</span>
          <div className="flex-1" />
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Xin chào, <span className="font-semibold text-foreground">{userName}</span>
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
