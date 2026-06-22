"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Ban, RotateCcw, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminUpdateUserAction, adminSetUserRoleAction } from "@/server/actions/admin";

/**
 * Bảng thao tác quản trị trên trang chi tiết người dùng:
 * phong/gỡ quyền admin (admin con), khoá/mở khoá, reset tim.
 * `isSelf` = đang xem chính mình → khoá nút đổi quyền để tránh tự khoá mình.
 */
export function UserManagePanel({
  userId,
  role,
  banned,
  isSelf,
}: {
  userId: string;
  role: "ADMIN" | "LEARNER";
  banned: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(res.error ?? "Có lỗi xảy ra.");
      }
    });
  }

  const isAdmin = role === "ADMIN";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Phong / gỡ quyền admin con */}
      <Button
        type="button"
        size="sm"
        variant={isAdmin ? "outline" : "default"}
        disabled={pending || isSelf}
        title={isSelf ? "Không thể tự đổi quyền của chính mình." : undefined}
        onClick={() => {
          const next = isAdmin ? "LEARNER" : "ADMIN";
          const msg = isAdmin
            ? "Gỡ quyền admin của người dùng này?"
            : "Phong người dùng này làm ADMIN (toàn quyền quản trị)?";
          if (!window.confirm(msg)) return;
          run(
            () => adminSetUserRoleAction({ userId, role: next }),
            isAdmin ? "Đã gỡ quyền admin." : "Đã phong làm admin."
          );
        }}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAdmin ? (
          <ShieldOff className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {isAdmin ? "Gỡ quyền admin" : "Phong làm admin"}
      </Button>

      {/* Khoá / mở khoá */}
      <Button
        type="button"
        size="sm"
        variant={banned ? "outline" : "destructive"}
        disabled={pending}
        onClick={() =>
          run(
            () => adminUpdateUserAction({ userId, action: banned ? "unban" : "ban" }),
            banned ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản."
          )
        }
      >
        <Ban className="h-4 w-4" />
        {banned ? "Mở khoá" : "Khoá tài khoản"}
      </Button>

      {/* Reset tim về tối đa */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(() => adminUpdateUserAction({ userId, action: "resetHearts" }), "Đã reset tim.")
        }
      >
        <RotateCcw className="h-4 w-4" />
        <Heart className="h-4 w-4 text-rose-500" /> Reset tim
      </Button>
    </div>
  );
}
