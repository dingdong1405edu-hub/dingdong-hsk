"use client";
import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Link2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  /** Name of the hidden input submitted with the form (the resulting image URL). */
  name?: string;
  /** Initial value (for edit forms). */
  defaultValue?: string | null;
  /** Optional aspect ratio for the preview box. */
  className?: string;
}

/**
 * Admin image picker. Uploads a real file to `/api/admin/upload` (drag & drop or
 * click) and stores the returned URL in a hidden input so it submits with the
 * surrounding server-action <form>. Also accepts a pasted URL as a fallback.
 */
export function ImageUpload({ name = "imageUrl", defaultValue, className }: ImageUploadProps) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 5MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        setUrl(data.url);
        toast.success("Đã tải ảnh lên");
      } else {
        toast.error(data.error ?? "Tải ảnh thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải ảnh");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Submitted value */}
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="group relative overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Xem trước" className="h-44 w-full object-contain" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-background/90 p-2 text-foreground shadow-sm transition hover:bg-background"
              title="Đổi ảnh"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setUrl("")}
              className="rounded-lg bg-background/90 p-2 text-destructive shadow-sm transition hover:bg-background"
              title="Xoá ảnh"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={fieldId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {uploading ? "Đang tải lên..." : "Kéo thả ảnh vào đây hoặc bấm để chọn"}
          </div>
          <div className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF · tối đa 5MB</div>
        </label>
      )}

      <input
        id={fieldId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      {/* URL fallback */}
      <button
        type="button"
        onClick={() => setShowUrl((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <Link2 className="h-3.5 w-3.5" /> {showUrl ? "Ẩn" : "Hoặc dán liên kết ảnh"}
      </button>
      {showUrl && (
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://... hoặc /images/..."
          className="text-sm"
        />
      )}
    </div>
  );
}
