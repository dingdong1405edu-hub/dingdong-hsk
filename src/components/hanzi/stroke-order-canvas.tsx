"use client";
import { useEffect, useRef } from "react";

interface Props {
  character: string;
  size?: number;
  animate?: boolean;
}

export function StrokeOrderCanvas({ character, size = 200, animate = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    import("hanzi-writer").then((HanziWriter) => {
      containerRef.current!.innerHTML = "";
      const writer = HanziWriter.default.create(containerRef.current!, character, {
        width: size,
        height: size,
        padding: 5,
        showOutline: true,
        strokeColor: "#1a1a1a",
        outlineColor: "#d4d4d8",
        drawingColor: "#dc2626",
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
      });
      writerRef.current = writer;
      if (animate) {
        writer.loopCharacterAnimation();
      }
    });

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [character, size, animate]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="tianzi-grid rounded-lg"
        style={{ width: size, height: size }}
      />
      <div className="flex gap-2">
        <button
          className="px-3 py-1 text-sm rounded border hover:bg-muted transition-colors"
          onClick={() => {
            if (writerRef.current) {
              (writerRef.current as { animateCharacter: () => void }).animateCharacter();
            }
          }}
        >
          Phát lại
        </button>
      </div>
    </div>
  );
}
