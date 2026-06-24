"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Type tin nhắn định nghĩa cục bộ ở client để KHÔNG import src/lib/chat (file đó
// kéo theo groq-sdk + process.env, không thuộc bundle trình duyệt).
export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const STORAGE_KEY = "dingdong-bao-chat-v1";
const MAX_STORED = 50;

function isMsg(v: unknown): v is ChatMessage {
  return (
    typeof v === "object" &&
    v !== null &&
    "role" in v &&
    "content" in v &&
    ((v as ChatMessage).role === "user" || (v as ChatMessage).role === "assistant") &&
    typeof (v as ChatMessage).content === "string"
  );
}

export interface UseBaoChat {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  send: (text: string) => void;
  reset: () => void;
}

/**
 * Quản lý hội thoại với trợ lý "Bao": gọi /api/chat ở chế độ stream và ghép câu
 * trả lời dần. Lưu hội thoại vào localStorage để giữ lại sau khi tải lại trang.
 */
export function useBaoChat(): UseBaoChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref đồng bộ để hàm send() đọc trạng thái mới nhất mà không cần phụ thuộc.
  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingRef = useRef(false);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Tải hội thoại đã lưu (một lần khi mount).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed.filter(isMsg).slice(-MAX_STORED));
      }
    } catch {
      /* bỏ qua dữ liệu hỏng */
    }
  }, []);

  // Lưu lại mỗi khi hội thoại đổi.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* localStorage đầy / bị chặn — bỏ qua */
    }
  }, [messages]);

  const send = useCallback((text: string) => {
    const content = text.trim();
    if (!content || streamingRef.current) return;

    setError(null);
    streamingRef.current = true;
    setIsStreaming(true);

    const history: ChatMessage[] = [...messagesRef.current, { role: "user", content }];
    // Hiện ngay tin của người dùng + một ô trả lời rỗng để gắn dòng stream vào.
    setMessages([...history, { role: "assistant", content: "" }]);

    (async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) {
          let msg = "Bao tạm thời không trả lời được. Bạn thử lại sau nhé!";
          try {
            const j = (await res.json()) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* phản hồi không phải JSON */
          }
          setMessages(history);
          setError(msg);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages([...history, { role: "assistant", content: acc }]);
        }

        if (!acc.trim()) {
          setMessages(history);
          setError("Bao chưa kịp trả lời. Bạn thử lại nhé!");
        }
      } catch {
        setMessages(history);
        setError("Mất kết nối tới trợ lý. Kiểm tra mạng rồi thử lại nhé!");
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
      }
    })();
  }, []);

  const reset = useCallback(() => {
    if (streamingRef.current) return;
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* bỏ qua */
    }
  }, []);

  return { messages, isStreaming, error, send, reset };
}
