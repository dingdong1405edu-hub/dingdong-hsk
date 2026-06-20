"use client";
import { useCallback, useEffect, useRef } from "react";
import { Eraser } from "lucide-react";

interface Props {
  size?: number;
}

/**
 * Step 3 of the per-word flow: a blank 田字格 grid the learner writes on freehand
 * with a finger/stylus/mouse — they reproduce the character from memory (no
 * guide character). Pure <canvas> + pointer events, no recognition; it's
 * deliberate handwriting practice. A Clear button resets the strokes.
 */
export function WritingGrid({ size = 240 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Red dashed cross + diagonals (traditional tianzi grid guides).
      ctx.save();
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.moveTo(size, 0);
      ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();

      // Solid outer border.
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
      ctx.restore();
    },
    [size]
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
    drawGrid(ctx);
  }, [size, drawGrid]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 9;
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
    if (ctx) drawGrid(ctx);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Tự viết lại chữ vào ô bên dưới.</p>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, touchAction: "none" }}
        className="rounded-lg border-2 border-slate-300 shadow-sm"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <Eraser className="h-4 w-4" /> Xóa
      </button>
    </div>
  );
}
