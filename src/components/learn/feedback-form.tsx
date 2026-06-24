"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitFeedbackAction } from "@/server/actions/feedback";

// Khớp với enum FeedbackCategory ở prisma/schema.prisma.
const CATEGORIES = [
  { value: "SUGGESTION", label: "Góp ý / đề xuất tính năng" },
  { value: "BUG", label: "Báo lỗi kỹ thuật" },
  { value: "QUESTION", label: "Câu hỏi / cần hỗ trợ" },
  { value: "CONTENT", label: "Góp ý nội dung bài học" },
  { value: "OTHER", label: "Khác" },
] as const;
type Category = (typeof CATEGORIES)[number]["value"];

const MAX = 4000;

export function FeedbackForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [category, setCategory] = useState<Category>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error("Nội dung quá ngắn — bạn viết chi tiết hơn một chút nhé.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitFeedbackAction({
        category,
        subject: subject.trim() || undefined,
        message: trimmed,
        contactEmail: email.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Đã gửi! Cảm ơn bạn đã góp ý cho DingDong 🥟");
        setSubject("");
        setMessage("");
        setCategory("SUGGESTION");
      } else {
        toast.error(res.error ?? "Không gửi được, bạn thử lại nhé.");
      }
    } catch {
      toast.error("Có lỗi xảy ra, bạn thử lại sau nhé.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fb-category">Chủ đề</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger id="fb-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fb-subject">
          Tiêu đề <span className="text-muted-foreground">(không bắt buộc)</span>
        </Label>
        <Input
          id="fb-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
          placeholder="Tóm tắt ngắn gọn điều bạn muốn nói"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fb-message">Nội dung</Label>
        <Textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
          rows={6}
          placeholder="Bạn gặp lỗi gì, muốn góp ý điều gì, hay cần hỗ trợ ra sao? Mô tả càng cụ thể càng tốt nhé."
          className="resize-y"
        />
        <p className="text-right text-xs text-muted-foreground">
          {message.length}/{MAX}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fb-email">
          Email liên hệ <span className="text-muted-foreground">(để chúng mình phản hồi lại)</span>
        </Label>
        <Input
          id="fb-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          placeholder="email@cua-ban.com"
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-2 sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Gửi góp ý
          </>
        )}
      </Button>
    </form>
  );
}
