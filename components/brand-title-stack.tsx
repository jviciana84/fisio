"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const SECOND_LINE = "Roc Blanc";

type BrandTitleStackProps = {
  firstLineClassName: string;
  secondLineClassName: string;
  className?: string;
};

/**
 * Dos lineas de marca: la segunda se escala en X para igualar el ancho visual de la primera.
 * Evita depender de letter-spacing + medidas fragiles con fuentes web.
 */
export function BrandTitleStack({ firstLineClassName, secondLineClassName, className }: BrandTitleStackProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const [scaleX, setScaleX] = useState(1);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el1 = line1Ref.current;
    const el2 = line2Ref.current;
    if (!el1 || !el2) return;

    let cancelled = false;

    const update = () => {
      if (cancelled || !line1Ref.current || !line2Ref.current) return;
      const a = line1Ref.current;
      const b = line2Ref.current;
      b.style.transform = "none";
      void a.offsetWidth;
      void b.offsetWidth;
      const w1 = a.getBoundingClientRect().width;
      const w2 = b.getBoundingClientRect().width;
      if (w2 <= 0.5 || w1 <= 0.5) return;
      setScaleX(Math.min(4, w1 / w2));
    };

    const schedule = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(update);
      });
    };

    schedule();
    const fonts = document.fonts;
    if (fonts?.ready) {
      void fonts.ready.then(() => {
        if (!cancelled) schedule();
      });
    }

    const ro =
      typeof ResizeObserver !== "undefined" && wrap ? new ResizeObserver(() => schedule()) : null;
    if (ro && wrap) {
      ro.observe(wrap);
    }
    window.addEventListener("resize", schedule);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={wrapRef} className={cn("flex w-max min-w-0 flex-col items-stretch gap-0 leading-none", className)}>
      <span ref={line1Ref} className={cn("inline-block", firstLineClassName)}>
        Fisioterapia
      </span>
      <div className="w-full min-w-0 overflow-visible">
        <span
          ref={line2Ref}
          className={cn("inline-block max-w-full origin-left", secondLineClassName)}
          style={{
            transform: `scaleX(${scaleX})`,
            transformOrigin: "left center",
            willChange: "transform",
          }}
        >
          {SECOND_LINE}
        </span>
      </div>
    </div>
  );
}
