"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { HSKLevel } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  reorderUnitsAction,
  reorderLessonsAction,
  reorderContentAction,
} from "@/server/actions/admin";
import { reorderMockExamsAction } from "@/server/actions/mock-exam";
import {
  reorderRoadmapLessonsAction,
  reorderRoadmapChaptersAction,
} from "@/server/actions/roadmap-admin";

// Một dòng đã được render sẵn ở server (Card/nội dung tuỳ trang). ReorderList chỉ
// bọc thêm tay cầm kéo–thả + nút lên/xuống và lo việc lưu thứ tự.
export interface ReorderItem {
  id: string;
  content: React.ReactNode;
}

// Khai báo phạm vi đổi chỗ — toàn bộ là dữ liệu thuần (serializable) nên truyền
// được từ server component sang client. ReorderList tự gọi đúng server action.
export type ReorderSpec =
  | { kind: "units"; skill: "vocab" | "grammar"; hskLevel: HSKLevel }
  | { kind: "lessons"; skill: "vocab" | "grammar"; unitId: string }
  | {
      kind: "content";
      model: "reading" | "listening" | "writing" | "speaking" | "hanzi";
      hskLevel: HSKLevel;
    }
  | { kind: "mockExam"; hskLevel: HSKLevel }
  | { kind: "roadmapLessons"; courseId: string }
  | { kind: "roadmapChapters"; courseId: string };

function persist(spec: ReorderSpec, orderedIds: string[]) {
  if (spec.kind === "units") return reorderUnitsAction(spec.skill, spec.hskLevel, orderedIds);
  if (spec.kind === "lessons") return reorderLessonsAction(spec.skill, spec.unitId, orderedIds);
  if (spec.kind === "mockExam") return reorderMockExamsAction(spec.hskLevel, orderedIds);
  if (spec.kind === "roadmapLessons") return reorderRoadmapLessonsAction(spec.courseId, orderedIds);
  if (spec.kind === "roadmapChapters") return reorderRoadmapChaptersAction(spec.courseId, orderedIds);
  return reorderContentAction(spec.model, spec.hskLevel, orderedIds);
}

export function ReorderList({
  items,
  spec,
  className,
}: {
  items: ReorderItem[];
  spec: ReorderSpec;
  className?: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const [pending, start] = useTransition();
  const dragIndex = useRef<number | null>(null);

  // Đồng bộ lại khi server gửi dữ liệu mới (sau khi thêm/xoá/đổi chỗ + refresh).
  useEffect(() => setOrder(items), [items]);

  function save(next: ReorderItem[]) {
    setOrder(next);
    start(async () => {
      const res = await persist(
        spec,
        next.map((i) => i.id)
      );
      if (!res.ok) toast.error(res.error ?? "Không lưu được thứ tự.");
      router.refresh();
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    save(next);
  }

  if (order.length === 0) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {order.map((it, i) => (
        <li
          key={it.id}
          draggable={!pending}
          onDragStart={() => (dragIndex.current = i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const from = dragIndex.current;
            dragIndex.current = null;
            if (from !== null) move(from, i);
          }}
          className="flex items-stretch gap-2"
        >
          {/* Cột điều khiển thứ tự — tay cầm kéo (desktop) + nút lên/xuống (mobile) */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border bg-muted/40 px-1 py-1">
            <button
              type="button"
              aria-label="Lên"
              disabled={pending || i === 0}
              onClick={() => move(i, i - 1)}
              className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/70" />
            <button
              type="button"
              aria-label="Xuống"
              disabled={pending || i === order.length - 1}
              onClick={() => move(i, i + 1)}
              className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">{it.content}</div>
        </li>
      ))}
      {pending && (
        <li className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu thứ tự…
        </li>
      )}
    </ul>
  );
}
