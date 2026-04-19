"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type BonoSignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
};

type Props = {
  className?: string;
  onDrawingChange?: (hasDrawing: boolean) => void;
};

function setupCanvas(canvas: HTMLCanvasElement) {
  const parentW = canvas.parentElement?.clientWidth ?? 0;
  const w = Math.max(280, Math.floor(canvas.offsetWidth || parentW || 320));
  const h = 160;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return { ctx, w, h };
}

/**
 * Lienzo de firma para ratón y tacto. Exporta PNG (data URL) para enviar al servidor.
 */
export const BonoSignaturePad = forwardRef<BonoSignaturePadHandle, Props>(function BonoSignaturePad(
  { className, onDrawingChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const dimsRef = useRef({ w: 320, h: 160 });

  const paintBlank = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    dimsRef.current = { w: setup.w, h: setup.h };
    hasStrokeRef.current = false;
    onDrawingChange?.(false);
  }, [onDrawingChange]);

  useEffect(() => {
    paintBlank();
  }, [paintBlank]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        paintBlank();
      },
      isEmpty: () => !hasStrokeRef.current,
      toDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasStrokeRef.current) return null;
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    }),
    [paintBlank],
  );

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const scaleX = dimsRef.current.w / r.width;
    const scaleY = dimsRef.current.h / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    canvas?.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      onDrawingChange?.(true);
    }
  }

  function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  const [isSupported] = useState(() => typeof window !== "undefined" && !!window.PointerEvent);

  if (!isSupported) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Tu navegador no permite capturar la firma. Prueba con otro navegador o dispositivo.
      </p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-xl border-2 border-slate-200 bg-white shadow-inner"
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
        onPointerLeave={endDraw}
      />
    </div>
  );
});
