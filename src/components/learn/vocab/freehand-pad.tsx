"use client";
import { useCallback, useEffect, useRef } from "react";
import { Eraser } from "lucide-react";

interface Props {
  /** The character to show faintly as a guide behind the writing surface. */
  char: string;
  size: number;
}

/**
 * Fallback writing surface for a character Hanzi Writer has no CDN stroke data
 * for. We can't validate strokes, so instead we show the glyph faintly as a
 * model and let the learner trace it freehand (finger / stylus / mouse). A
 * Clear button repaints the grid + watermark.
 */
export function FreehandPad({ char, size }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const paintBackdrop = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Dashed 田字格 guides.
      ctx.save();
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
      ctx.restore();

      // Faint character watermark to write over.
      ctx.save();
      ctx.fillStyle = "#e5e7eb";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.floor(size * 0.78)}px 'Noto Sans SC', sans-serif`;
      ctx.fillText(char, size / 2, size / 2 + size * 0.02);
      ctx.restore();
    },
    [char, size]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    paintBackdrop(ctx);
  }, [size, paintBackdrop]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = Math.max(6, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintBackdrop(ctx);
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, touchAction: "none" }}
        className="rounded-lg border-2 border-slate-300 bg-white shadow-sm"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Eraser className="h-3.5 w-3.5" /> Xóa
      </button>
    </div>
  );
}
