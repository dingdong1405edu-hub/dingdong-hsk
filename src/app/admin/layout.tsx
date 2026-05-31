import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/vocab", label: "Từ vựng" },
  { href: "/admin/grammar", label: "Ngữ pháp" },
  { href: "/admin/hanzi", label: "Chữ Hán" },
  { href: "/admin/reading", label: "Đọc hiểu" },
  { href: "/admin/listening", label: "Nghe hiểu" },
  { href: "/admin/writing", label: "Bài viết" },
  { href: "/admin/speaking", label: "Luyện nói" },
  { href: "/admin/users", label: "Người dùng" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 min-h-screen p-4 space-y-1 shrink-0">
        <div className="text-lg font-bold mb-4 text-primary">Admin Panel</div>
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            {label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
