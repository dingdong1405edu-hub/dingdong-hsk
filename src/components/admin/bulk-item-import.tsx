"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  ClipboardPaste,
  FileJson,
  Download,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BulkImportResult } from "@/server/actions/admin";

interface Props {
  /** Server Action nhận chuỗi JSON (1 mảng các mục đầy đủ) và tạo hàng loạt. */
  action: (jsonText: string) => Promise<BulkImportResult>;
  /** Tiêu đề hộp thoại, VD "Nhập hàng loạt bài đọc". */
  title: string;
  /** Danh từ đơn vị để hiển thị, VD "bài đọc" / "bộ nói" / "tài liệu". */
  unitNoun: string;
  /** JSON mẫu (đã format) — dùng cho nút "Dùng mẫu" + tải file mẫu. */
  sampleJson: string;
  /** Tên file khi tải mẫu, VD "mau-bai-doc.json". */
  sampleFileName: string;
  /** Mô tả ngắn dưới tiêu đề (giải thích các cột/khoá JSON). */
  description?: string;
  /** Bài có câu hỏi lồng nhau (đọc/nghe) → xem trước hiển thị thêm số câu hỏi. */
  hasQuestions?: boolean;
  /** Mục mới ở trạng thái Bản nháp (mặc định true). Đặt false cho module xuất bản ngay (vd tài liệu). */
  draft?: boolean;
  /** Nhãn nút mở (mặc định "Nhập hàng loạt"). */
  triggerLabel?: string;
}

type Preview =
  | { error: string }
  | { items: number; questions: number };

function buildPreview(text: string): Preview | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: "JSON chưa hợp lệ — kiểm tra dấu ngoặc/dấu phẩy." };
  }
  if (!Array.isArray(parsed)) return { error: "Cần một MẢNG JSON: [ { … }, { … } ]." };
  let questions = 0;
  for (const it of parsed) {
    if (it && typeof it === "object") {
      const q = (it as Record<string, unknown>).questions;
      if (Array.isArray(q)) questions += q.length;
    }
  }
  return { items: parsed.length, questions };
}

export function BulkItemImport({
  action,
  title,
  unitNoun,
  sampleJson,
  sampleFileName,
  description,
  hasQuestions = false,
  draft = true,
  triggerLabel = "Nhập hàng loạt",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => buildPreview(json), [json]);
  const canImport = !!preview && !("error" in preview) && preview.items > 0;

  function reset() {
    setJson("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      setJson(text);
      setFileName(file.name);
    } catch {
      toast.error("Không đọc được file. Hãy dùng file .json hợp lệ.");
    }
  }

  function downloadSample() {
    const blob = new Blob(["﻿" + sampleJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sampleFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (pending || !canImport) return;
    setPending(true);
    const res = await action(json);
    setPending(false);
    if (res.ok) {
      const extra =
        hasQuestions && res.totalQuestions ? ` (${res.totalQuestions} câu hỏi)` : "";
      const draftNote = draft ? " Đang ở Bản nháp — nhớ xuất bản." : "";
      toast.success(`Đã thêm ${res.created} ${unitNoun}${extra}.${draftNote}`);
      reset();
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Tabs defaultValue="paste">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">
              <ClipboardPaste className="mr-1.5 h-4 w-4" /> Dán JSON
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileJson className="mr-1.5 h-4 w-4" /> Tải file .json
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-2">
            <Textarea
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setFileName(null);
              }}
              placeholder={sampleJson}
              className="min-h-72 font-mono text-xs"
              spellCheck={false}
              disabled={pending}
            />
          </TabsContent>

          <TabsContent value="file" className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={pending}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            />
            {fileName && <p className="text-[11px] text-muted-foreground">Đã đọc: {fileName}</p>}
            {json && (
              <Textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                className="min-h-48 font-mono text-xs"
                spellCheck={false}
                disabled={pending}
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setJson(sampleJson)}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Dùng mẫu
          </button>
          <button
            type="button"
            onClick={downloadSample}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Tải file mẫu (.json)
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="text-sm">
            {"error" in preview ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> {preview.error}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {preview.items} {unitNoun}
                {hasQuestions && preview.questions > 0 ? ` · ${preview.questions} câu hỏi` : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={handleImport} disabled={!canImport || pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {pending ? "Đang nhập..." : "Nhập hàng loạt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
