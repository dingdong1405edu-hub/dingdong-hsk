"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { BaoArt, type BaoPose } from "./bao-art";
import { onBao, type BaoReaction } from "@/lib/bao-bus";
import styles from "./bao-companion.module.css";

type Fx = "" | "pop" | "shake";

interface ReactionLook {
  pose: BaoPose;
  fx: Fx;
  bubble: string | null;
  /** Thời gian giữ phản ứng trước khi về idle (ms). */
  hold: number;
}

/** Ánh xạ tín hiệu bus → biểu cảm + lời thoại mặc định (có thể bị message ghi đè). */
function look(reaction: BaoReaction): ReactionLook {
  switch (reaction) {
    case "correct":
      return { pose: "proud", fx: "pop", bubble: "好! 👍", hold: 1600 };
    case "wrong":
      return { pose: "sad", fx: "shake", bubble: "Cố lên nhé!", hold: 1800 };
    case "complete":
      return { pose: "cheer", fx: "pop", bubble: "做得好!", hold: 2400 };
    case "celebrate":
      return { pose: "cheer", fx: "pop", bubble: "Tuyệt vời! 🎉", hold: 2800 };
    case "streak":
      return { pose: "proud", fx: "pop", bubble: "Giữ chuỗi nhé! 🔥", hold: 2400 };
    case "heartGift":
      return { pose: "proud", fx: "pop", bubble: "+1 ❤️", hold: 2200 };
    case "heartLost":
      return { pose: "sad", fx: "shake", bubble: "Tiếc quá 💔", hold: 1800 };
    case "thinking":
      return { pose: "think", fx: "", bubble: "Để Bao xem…", hold: 6000 };
    case "wave":
      return { pose: "wave", fx: "", bubble: null, hold: 1800 };
  }
}

/**
 * BaoCompanion — chú Bao nổi ở góc màn hình khu vực học. Vừa là linh vật (idle
 * sống động: chớp mắt, thi thoảng vẫy tay), vừa phản ứng theo thời gian thực với
 * tín hiệu từ bus (đúng/sai/hoàn thành/đang chấm…), vừa là nút mở trợ lý chat.
 */
export function BaoCompanion({ onOpen }: { onOpen: () => void }) {
  const [pose, setPose] = useState<BaoPose>("idle");
  const [fx, setFx] = useState<Fx>("");
  const [bubble, setBubble] = useState<string | null>(null);
  // Đổi mỗi reaction → remount BaoArt để hiệu ứng CSS chạy lại từ đầu.
  const [tick, setTick] = useState(0);

  const revertRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const play = (l: ReactionLook, message?: string) => {
      if (revertRef.current) clearTimeout(revertRef.current);
      setPose(l.pose);
      setFx(reduce ? "" : l.fx);
      setBubble(message?.trim() || l.bubble);
      setTick((t) => t + 1);
      revertRef.current = setTimeout(() => {
        setPose("idle");
        setFx("");
        setBubble(null);
      }, l.hold);
    };

    const unsub = onBao(({ reaction, message }) => play(look(reaction), message));

    // Vẫy chào khi vừa xuất hiện.
    const greet = setTimeout(() => play(look("wave")), 900);

    // Idle sống động: thi thoảng vẫy tay nếu đang rảnh (bỏ khi reduce-motion).
    if (!reduce) {
      idleRef.current = setInterval(() => {
        setPose((p) => (p === "idle" ? "wave" : p));
        setTick((t) => t + 1);
        window.setTimeout(() => setPose((p) => (p === "wave" ? "idle" : p)), 1700);
      }, 12000);
    }

    return () => {
      unsub();
      clearTimeout(greet);
      if (revertRef.current) clearTimeout(revertRef.current);
      if (idleRef.current) clearInterval(idleRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Mở trợ lý học tập Bao"
      className={styles.btn}
      style={{ "--bao-size": "66px" } as React.CSSProperties}
    >
      {bubble && (
        <span className={styles.bubble} aria-hidden>
          {bubble}
        </span>
      )}

      <span className={styles.platform}>
        <span
          key={tick}
          className={`${styles.holder}${fx ? ` ${styles[fx]}` : ""}`}
        >
          <BaoArt pose={pose} />
        </span>

        <span className={styles.badge} aria-hidden>
          <MessageCircle />
        </span>
      </span>
    </button>
  );
}
