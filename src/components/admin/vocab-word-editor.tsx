"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteVocabWordAction, reorderVocabWordsAction } from "@/server/actions/admin";
import { VocabWordForm } from "./vocab-word-form";
import type { VocabWordCard } from "@/types";

interface Props {
  lessonId: string;
  unitId: string;
  words: VocabWordCard[];
}

export function VocabWordEditor({ lessonId, unitId, words }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<VocabWordCard[]>(words);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const dragIndex = useRef<number | null>(null);

  // Re-sync when the server sends fresh data (after a mutation + refresh).
  useEffect(() => setItems(words), [words]);

  async function persistOrder(next: VocabWordCard[]) {
    setItems(next);
    await reorderVocabWordsAction(unitId, next.map((w) => w.id));
    router.refresh();
  }

  function handleDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    void persistOrder(next);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Xóa từ này khỏi bài học?")) return;
    await deleteVocabWordAction(id, unitId);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          Chưa có từ nào. Nhấn “Thêm từ” để bắt đầu.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((w, i) => (
            <li key={w.id}>
              <div
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className="flex items-center gap-2 rounded-md border bg-background p-2"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="font-chinese text-lg">{w.hanzi}</span>
                <span className="font-pinyin text-sm text-muted-foreground">{w.pinyin}</span>
                <span className="truncate text-sm">— {w.meaning}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {w.examples.length} ví dụ
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(editing === w.id ? null : w.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {editing === w.id && (
                <div className="mt-1.5">
                  <VocabWordForm
                    lessonId={lessonId}
                    unitId={unitId}
                    word={w}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing === "new" ? (
        <VocabWordForm
          lessonId={lessonId}
          unitId={unitId}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> Thêm từ
        </Button>
      )}
    </div>
  );
}
