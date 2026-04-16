import { cn } from "@/lib/cn"

/** Marca de agua con el isotipo FRB3; la sección debe ser `relative overflow-hidden`. */
const LOGO_FRB3_SRC = "/images/logo%20FRB3.svg"

const BASE_SCALE = 1.14

export type SectionWatermarkAlign = "right" | "left" | "center"

const justifyClass: Record<SectionWatermarkAlign, string> = {
  right: "justify-end",
  left: "justify-start",
  center: "justify-center",
}

const objectClass: Record<SectionWatermarkAlign, string> = {
  right: "object-right",
  left: "object-left",
  center: "object-center",
}

const originClass: Record<SectionWatermarkAlign, string> = {
  right: "origin-right",
  left: "origin-left",
  center: "origin-center",
}

export type SectionWatermarkProps = {
  align: SectionWatermarkAlign
  /** Multiplicador del tamaño base (~1.14). `0.5` ≈ mitad del tamaño habitual. Por defecto `1`. */
  scaleFactor?: number
  /** `white`: silueta blanca (p. ej. sobre fondo oscuro). Por defecto colores del SVG. */
  tone?: "default" | "white"
}

/**
 * Marca de agua a altura casi completa de la sección (compensa el padding vertical típico).
 */
export function SectionWatermark({
  align,
  scaleFactor = 1,
  tone = "default",
}: SectionWatermarkProps) {
  const scale = BASE_SCALE * scaleFactor

  return (
    <div
      className={`pointer-events-none absolute -inset-y-14 left-0 right-0 z-[1] flex items-stretch sm:-inset-y-16 ${justifyClass[align]} overflow-hidden select-none`}
      aria-hidden
    >
      <img
        src={LOGO_FRB3_SRC}
        alt=""
        width={1000}
        height={1286}
        style={{ transform: `scale(${scale})` }}
        className={cn(
          "h-full w-auto max-w-none shrink-0 self-stretch object-contain",
          objectClass[align],
          originClass[align],
          tone === "white" && "brightness-0 invert",
          tone === "default" ? "opacity-[0.07] md:opacity-[0.085]" : "opacity-[0.12] md:opacity-[0.14]",
        )}
        decoding="async"
      />
    </div>
  )
}
