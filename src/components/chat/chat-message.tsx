"use client";
import { cn } from "@/lib/utils";
import type { ChatRole } from "./use-bao-chat";

/** Avatar tròn của chú bánh bao Bao — dùng ở bong bóng trả lời và header panel. */
export function BaoAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-base shadow-sm ring-1 ring-amber-300/60",
        className
      )}
      aria-hidden
    >
      🥟
    </div>
  );
}

/** Render văn bản với markdown nhẹ: **đậm**. Xuống dòng do CSS whitespace-pre-wrap giữ. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.length >= 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessage({
  role,
  content,
  streaming,
}: {
  role: ChatRole;
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";

  // Ô trả lời còn rỗng trong lúc đang chờ stream → ba chấm "đang gõ".
  if (!isUser && !content && streaming) {
    return (
      <div className="flex items-end gap-2">
        <BaoAvatar className="h-8 w-8" />
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <BaoAvatar className="h-8 w-8" />}
      <div
        className={cn(
          "max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {renderInline(content)}
      </div>
    </div>
  );
}
