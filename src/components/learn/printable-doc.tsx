"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { hskLevelLabel } from "@/lib/utils";

/** Footer lặp lại ở chân mỗi trang in (xem .print-footer trong globals.css). */
export function PrintFooter() {
  return <div className="print-footer">dingdonghsk.com</div>;
}

interface Props {
  title: string;
  subtitle?: string;
  titleZh?: string;
  hskLevel: string;
  backHref: string;
  /** Nút/điều khiển thêm trên thanh công cụ (ẩn khi in). */
  toolbarExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Khung tài liệu in dùng chung cho mọi loại PDF (từ vựng, đọc, nghe, viết, nói).
 * Cơ chế: print CSS cô lập `.print-document`; bấm "Tải PDF" gọi window.print() để
 * lưu thành PDF. Footer "dingdonghsk.com" lặp ở chân mỗi trang.
 */
export function PrintableDoc({ title, subtitle, titleZh, hskLevel, backHref, toolbarExtra, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Tải PDF
          </Button>
        </div>
      </div>
      <p className="no-print text-center text-xs text-muted-foreground">
        Bấm “Tải PDF”, sau đó chọn “Lưu thành PDF” (Save as PDF) trong hộp thoại in của trình duyệt.
      </p>

      {/* The printable document */}
      <div className="print-document rounded-2xl border bg-white p-6 text-[13px] leading-relaxed text-zinc-800 sm:p-10">
        <header className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-primary">DingDong HSK</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Học tiếng Trung
              </div>
            </div>
          </div>
          <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
            {hskLevelLabel(hskLevel)}
          </div>
        </header>

        <div className="mb-6">
          {subtitle && <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{subtitle}</div>}
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          {titleZh && <p className="font-chinese text-zinc-500">{titleZh}</p>}
        </div>

        {children}

        <PrintFooter />
      </div>
    </div>
  );
}
