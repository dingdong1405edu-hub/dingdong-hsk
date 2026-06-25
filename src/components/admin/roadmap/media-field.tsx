"use client";
import { useState } from "react";
import { Loader2, UploadCloud, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Trường media CÓ KIỂM SOÁT (value/onChange) — khác ImageUpload (dùng cho
 * <form> FormData). Tải ảnh lên /api/admin/upload hoặc audio lên /api/admin/audio
 * (đều trả { ok, url }), hoặc dán URL. Để trống audio = trình duyệt tự đọc zh-CN.
 */
export function MediaField({
  value,
  onChange,
  kind = "image",
  label,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  kind?: "image" | "audio";
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const endpoint = kind === "audio" ? "/api/admin/audio" : "/api/admin/upload";
  const accept = kind === "audio" ? "audio/*" : "image/*";

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (data.url) {
        onChange(data.url);
        toast.success("Đã tải lên");
      } else {
        toast.error(data.error ?? "Tải lên thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải lên");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" />
          )}
          Tải {kind === "audio" ? "audio" : "ảnh"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5" /> Xoá
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={
            kind === "audio" ? "https://....mp3 (để trống = máy đọc)" : "https://... hoặc /api/files/..."
          }
          className="h-8 text-sm"
        />
      </div>
      {kind === "image" && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 rounded-lg border object-contain" />
      ) : null}
      {kind === "audio" && value ? <audio src={value} controls className="h-8 w-full" /> : null}
    </div>
  );
}
