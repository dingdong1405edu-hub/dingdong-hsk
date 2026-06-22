"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeSubscriptionAction } from "@/server/actions/admin";

/** Nút thu hồi (xoá) một gói quyền lợi đã cấp cho người dùng. */
export function RevokeSubscriptionButton({
  subscriptionId,
  label,
}: {
  subscriptionId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => {
        if (!window.confirm(`Thu hồi gói "${label}"? Người dùng sẽ mất quyền lợi này.`)) return;
        start(async () => {
          const res = await revokeSubscriptionAction(subscriptionId);
          if (res.ok) {
            toast.success("Đã thu hồi gói.");
            router.refresh();
          } else {
            toast.error(res.error ?? "Không thu hồi được.");
          }
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Thu hồi
    </Button>
  );
}
