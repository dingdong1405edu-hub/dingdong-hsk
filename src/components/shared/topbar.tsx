"use client";
import Link from "next/link";
import { Menu, Flame, Heart, Star, LogOut, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface TopbarUser {
  name?: string | null;
  email: string;
  image?: string | null;
  xp: number;
  hearts: number;
  unlimitedHearts: boolean;
  streakDays: number;
  role: string;
}

function Stat({ icon: Icon, value, className }: { icon: LucideIcon; value: number; className: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-sm font-semibold">
      <Icon className={cn("h-4 w-4", className)} />
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function Topbar({ user, onMenu }: { user: TopbarUser; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:gap-3 sm:px-6">
      <Button variant="ghost" size="icon" className="-ml-1 shrink-0 lg:hidden" onClick={onMenu} aria-label="Mở menu">
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/" className="flex shrink-0 items-center gap-2 lg:hidden" aria-label="DingDong HSK — về trang chủ">
        <Logo className="h-8 w-8" />
        {/* Ẩn chữ trên điện thoại rất nhỏ để chừa chỗ cho dải chỉ số (streak/tim/XP) */}
        <span className="hidden font-extrabold tracking-tight min-[380px]:inline">DingDong</span>
      </Link>

      <div className="flex-1" />

      {!user.unlimitedHearts && (
        <Button asChild size="sm" className="mr-1 hidden sm:inline-flex">
          <Link href="/payment">
            <Sparkles className="h-4 w-4" /> Nâng cấp
          </Link>
        </Button>
      )}

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Stat icon={Flame} value={user.streakDays} className="text-orange-500 fill-orange-400" />
        {user.unlimitedHearts ? (
          <div
            className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-sm font-semibold"
            title="Tim không giới hạn"
          >
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            <span className="leading-none">∞</span>
          </div>
        ) : (
          <Stat icon={Heart} value={user.hearts} className="text-rose-500 fill-rose-500" />
        )}
        <Stat icon={Star} value={user.xp} className="text-amber-500 fill-amber-400" />
      </div>

      <ThemeToggle className="hidden sm:inline-flex" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {(user.name?.charAt(0) ?? user.email.charAt(0)).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-semibold">{user.name ?? "Học viên"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          {!user.unlimitedHearts && (
            <DropdownMenuItem asChild>
              <Link href="/payment">
                <Sparkles className="mr-2 h-4 w-4" /> Nâng cấp
              </Link>
            </DropdownMenuItem>
          )}
          {user.role === "ADMIN" && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" /> Trang quản trị
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
