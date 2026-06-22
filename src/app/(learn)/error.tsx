"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-lg font-bold">Đã xảy ra lỗi</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Trang gặp sự cố khi hiển thị. Bạn hãy thử lại — nếu vẫn lỗi, quay về trang chính.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Về trang chính</Link>
        </Button>
      </div>
    </div>
  );
}
