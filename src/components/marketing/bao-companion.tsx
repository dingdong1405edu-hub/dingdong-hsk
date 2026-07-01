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
      return { pose: "proud", fx: "pop", bubble: "好! 👍", hold: 1500 };
    case "wrong":
      return { pose: "sad", fx: "shake", bubble: "Cố lên nhé!", hold: 1600 };
    case "complete":
      return { pose: "cheer", fx: "pop", bubble: "做得好!", hold: 2000 };
    case "celebrate":
      return { pose: "cheer", fx: "pop", bubble: "Tuyệt vời! 🎉", hold: 2200 };
    case "streak":
      return { pose: "proud", fx: "pop", bubble: "Giữ chuỗi nhé! 🔥", hold: 2000 };
    case "heartGift":
      return { pose: "proud", fx: "pop", bubble: "+1 ❤️", hold: 1800 };
    case "heartLost":
      return { pose: "sad", fx: "shake", bubble: "Tiếc quá 💔", hold: 1600 };
    case "thinking":
      return { pose: "think", fx: "", bubble: "Để Bao xem…", hold: 5000 };
    case "wave":
      return { pose: "wave", fx: "", bubble: null, hold: 1500 };
  }
}

/**
 * BaoCompanion — nút nổi nhỏ gọn ở góc màn hình khu vực học: vừa là linh vật Bao
 * (biểu cảm theo thời gian thực với tín hiệu từ bus — đúng/sai/hoàn thành…), vừa
 * là cửa mở trợ lý chat. Thiết kế tối giản: không vòng nhịp, không tự vẫy tay,
 * để không gây rối mắt và không che các nút bấm trên mobile.
 */
export function BaoCompanion({ onOpen }: { onOpen: () => void }) {
  const [pose, setPose] = useState<BaoPose>("idle");
  const [fx, setFx] = useState<Fx>("");
  const [bubble, setBubble] = useState<string | null>(null);
  // Đổi mỗi reaction → remount BaoArt để hiệu ứng CSS chạy lại từ đầu.
  const [tick, setTick] = useState(0);

  const revertRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    return () => {
      unsub();
      if (revertRef.current) clearTimeout(revertRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Mở trợ lý học tập Bao"
      className={styles.btn}
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
