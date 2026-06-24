"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useBaoChat } from "./use-bao-chat";
import { ChatPanel } from "./chat-panel";

/**
 * Bong bóng trợ lý "Bao" nổi ở góc phải dưới mọi trang trong khu vực học. Sở hữu
 * trạng thái hội thoại (useBaoChat) ở đây nên cuộc trò chuyện được giữ nguyên khi
 * đóng/mở panel hoặc chuyển trang (DashboardShell không bị unmount).
 */
export function ChatWidget({ userName }: { userName?: string | null }) {
  const [open, setOpen] = useState(false);
  const chat = useBaoChat();

  // Esc để đóng panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Nút mở */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            aria-label="Mở trợ lý học tập Bao"
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-[11px] shadow ring-2 ring-card"
              aria-hidden
            >
              🥟
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Trợ lý học tập Bao"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed inset-x-3 bottom-3 z-40 h-[72vh] max-h-[calc(100vh-1.5rem)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[620px] sm:w-[384px]"
          >
            <ChatPanel chat={chat} userName={userName} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
