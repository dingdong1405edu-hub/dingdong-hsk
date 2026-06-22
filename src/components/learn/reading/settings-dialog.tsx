"use client";
import { Type, AlignJustify, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FONT_SIZES, LEADINGS, THEMES, type ReadingSettings } from "./types";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: ReadingSettings;
  onChange: (s: ReadingSettings) => void;
}

function SegRow<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onSelect(o.value)}
          className={cn(
            "flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold transition-colors",
            value === o.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:border-primary/40",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange, settings, onChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tuỳ chỉnh đọc</DialogTitle>
          <DialogDescription>Áp dụng cho khung đoạn văn.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Type className="h-3.5 w-3.5" /> Cỡ chữ
            </span>
            <SegRow
              options={FONT_SIZES}
              value={settings.fontSize}
              onSelect={(v) => onChange({ ...settings, fontSize: v })}
            />
          </div>
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <AlignJustify className="h-3.5 w-3.5" /> Giãn dòng
            </span>
            <SegRow
              options={LEADINGS}
              value={settings.leading}
              onSelect={(v) => onChange({ ...settings, leading: v })}
            />
          </div>
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> Nền đọc
            </span>
            <SegRow
              options={THEMES}
              value={settings.theme}
              onSelect={(v) => onChange({ ...settings, theme: v })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
