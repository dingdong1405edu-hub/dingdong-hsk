"use client";
import { useState, useTransition } from "react";
import { MessageSquareWarning, Flag, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  submitWordReportAction,
  getWordCommentsAction,
  type PublicComment,
} from "@/server/actions/word-report";

type Kind = "ERROR" | "COMMENT";

/**
 * Nút "Phản ánh" trên thẻ từ: học viên báo lỗi (từ/nghĩa/pinyin sai) hoặc bình
 * luận. Gửi đi ở trạng thái chờ duyệt; admin duyệt thì bình luận mới hiện công
 * khai. Dialog cũng hiển thị các bình luận đã được duyệt của từ này.
 */
export function WordReportButton({ wordId, hanzi }: { wordId: string; hanzi: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("ERROR");
  const [content, setContent] = useState("");
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && comments === null) {
      // Tải bình luận đã duyệt khi mở.
      getWordCommentsAction(wordId).then(setComments).catch(() => setComments([]));
    }
  }

  function submit() {
    if (content.trim().length < 2) {
      toast.error("Vui lòng nhập nội dung");
      return;
    }
    startTransition(async () => {
      const res = await submitWordReportAction({ wordId, kind, content: content.trim() });
      if (res.ok) {
        toast.success("Đã gửi! Phản ánh sẽ hiển thị sau khi admin duyệt.");
        setContent("");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Gửi thất bại");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageSquareWarning className="h-3.5 w-3.5" /> Phản ánh từ này
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Phản ánh về từ <span className="font-chinese">{hanzi}</span>
          </DialogTitle>
          <DialogDescription>
            Báo lỗi nếu từ/nghĩa/pinyin sai, hoặc để lại bình luận. Nội dung được admin duyệt trước khi hiển thị.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <KindTab active={kind === "ERROR"} onClick={() => setKind("ERROR")} icon={Flag} label="Báo lỗi" />
          <KindTab active={kind === "COMMENT"} onClick={() => setKind("COMMENT")} icon={MessageSquare} label="Bình luận" />
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={kind === "ERROR" ? "Mô tả lỗi (vd: nghĩa sai, pinyin sai…)" : "Bình luận của bạn về từ này…"}
          className="min-h-24"
          maxLength={1000}
        />
        <Button onClick={submit} disabled={pending} className="w-full">
          {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Gửi phản ánh
        </Button>

        {/* Bình luận đã duyệt */}
        {comments && comments.length > 0 && (
          <div className="mt-1 max-h-44 space-y-2 overflow-y-auto border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Bình luận ({comments.length})</p>
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-muted/60 p-2 text-sm">
                <div className="text-[11px] font-medium text-muted-foreground">{c.authorName}</div>
                <div className="whitespace-pre-line">{c.content}</div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KindTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
