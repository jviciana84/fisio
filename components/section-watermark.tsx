/** Marca de agua con el isotipo FRB3; la sección debe ser `relative overflow-hidden`. */
const LOGO_FRB3_SRC = "/images/logo%20FRB3.svg"

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

/**
 * Marca de agua a altura casi completa de la sección (compensa el padding vertical típico).
 */
export function SectionWatermark({ align }: { align: SectionWatermarkAlign }) {
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
        className={`h-full w-auto max-w-none shrink-0 self-stretch object-contain ${objectClass[align]} ${originClass[align]} scale-[1.14] opacity-[0.07] md:opacity-[0.085]`}
        decoding="async"
      />
    </div>
  )
}
