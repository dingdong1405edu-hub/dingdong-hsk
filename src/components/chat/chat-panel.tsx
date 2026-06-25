"use client";
import { useEffect, useRef, useState } from "react";
import { Send, X, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessage, BaoAvatar } from "./chat-message";
import type { UseBaoChat } from "./use-bao-chat";

const SUGGESTIONS = [
  "Giải thích 4 thanh điệu tiếng Trung",
  "Phân biệt 的, 得 và 地",
  "Vài câu chào hỏi cơ bản",
  "Mẹo nhớ chữ Hán dễ hơn",
];

export function ChatPanel({
  chat,
  userName,
  onClose,
}: {
  chat: UseBaoChat;
  userName?: string | null;
  onClose: () => void;
}) {
  const { messages, isStreaming, error, send, reset } = chat;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstName = userName?.trim().split(/\s+/).pop();

  // Cuộn xuống cuối khi có tin mới / đang stream.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming]);

  // Tự focus ô nhập khi mở panel.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const text = input.trim();
    if (!text || isStreaming) return;
    send(text);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-amber-100/50 dark:to-amber-500/10 px-4 py-3">
        <BaoAvatar className="h-9 w-9" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            Bao <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            Trợ lý học tiếng Trung · luôn sẵn sàng
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={isStreaming}
            aria-label="Xoá hội thoại"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng trợ lý"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <BaoAvatar className="h-14 w-14 text-2xl" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Chào {firstName ? firstName : "bạn"}! Mình là Bao 🥟
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hỏi mình bất cứ điều gì về tiếng Trung — từ vựng, ngữ pháp, chữ Hán, thanh điệu hay
                cách ôn thi HSK nhé!
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              streaming={isStreaming && i === messages.length - 1}
            />
          ))
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background/60 p-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Nhập câu hỏi cho Bao…"
            className={cn(
              "max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!input.trim() || isStreaming}
            aria-label="Gửi"
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          Bao là AI nên đôi khi có thể nhầm — hãy kiểm tra lại thông tin quan trọng.
        </p>
      </div>
    </div>
  );
}
