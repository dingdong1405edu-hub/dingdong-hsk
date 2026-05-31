"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BookOpen, Flame, Heart, Star, LogOut, Settings, User } from "lucide-react";
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

interface NavBarProps {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
    xp: number;
    hearts: number;
    streakDays: number;
    role: string;
  };
}

export function NavBar({ user }: NavBarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-2xl">🔔</span>
          <span className="text-primary">DingDong</span>
          <span className="text-muted-foreground font-normal text-sm">HSK</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/dashboard", label: "Tổng quan" },
            { href: "/vocab", label: "Từ vựng" },
            { href: "/grammar", label: "Ngữ pháp" },
            { href: "/hanzi", label: "Chữ Hán" },
            { href: "/reading", label: "Đọc hiểu" },
            { href: "/listening", label: "Nghe hiểu" },
            { href: "/writing", label: "Viết" },
            { href: "/speaking", label: "Nói" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname.startsWith(href) && href !== "/dashboard"
                  ? "bg-primary/10 text-primary font-medium"
                  : pathname === href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-orange-500 font-semibold">
              <Flame className="h-4 w-4" />
              {user.streakDays}
            </span>
            <span className="flex items-center gap-1 text-rose-500 font-semibold">
              <Heart className="h-4 w-4" />
              {user.hearts}
            </span>
            <span className="flex items-center gap-1 text-yellow-500 font-semibold">
              <Star className="h-4 w-4" />
              {user.xp}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              {user.role === "ADMIN" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Settings className="h-4 w-4 mr-2" /> Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
