"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { HERO_CARD_CAROUSEL_SLIDES } from "@/lib/hero-card-carousel-slides"
import { cn } from "@/lib/cn"

const AUTO_MS = 6000

type HeroCardCarouselProps = {
  className?: string
  /** Ocupa todo el alto disponible del contenedor (flex-1 + min-h-0). */
  fillHeight?: boolean
}

export function HeroCardCarousel({ className, fillHeight }: HeroCardCarouselProps) {
  const [index, setIndex] = useState(0)
  const n = HERO_CARD_CAROUSEL_SLIDES.length

  const go = useCallback((dir: -1 | 1) => {
    setIndex((i) => (i + dir + n) % n)
  }, [n])

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % n), AUTO_MS)
    return () => window.clearInterval(id)
  }, [n])

  const slide = HERO_CARD_CAROUSEL_SLIDES[index]

  return (
    <div
      className={cn(
        "group/carousel relative overflow-hidden rounded-2xl border border-white/40 touch-pan-y",
        fillHeight && "h-full min-h-0 flex-1",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={slide.src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover object-center sm:object-[50%_42%]"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={index === 0}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/10 to-transparent" />

      <button
        type="button"
        onClick={() => go(-1)}
        className="pointer-events-auto absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:h-10 sm:w-10"
        aria-label="Imagen anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="pointer-events-auto absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/75 text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:h-10 sm:w-10"
        aria-label="Imagen siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="pointer-events-auto absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5 px-10">
        {HERO_CARD_CAROUSEL_SLIDES.map((_, i) => (
          <button
            key={HERO_CARD_CAROUSEL_SLIDES[i].src}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/45 hover:bg-white/70",
            )}
            aria-label={`Ir a la imagen ${i + 1} de ${n}`}
            aria-current={i === index}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-30 inline-flex max-w-[min(100%,calc(100%-5rem))] items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-blue-700 shadow-sm backdrop-blur-sm sm:top-4 sm:right-4 sm:gap-2 sm:px-3 sm:text-xs">
        <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400 sm:h-3.5 sm:w-3.5" aria-hidden />
        <span className="leading-tight">Centro recomendado en Terrassa</span>
      </div>
    </div>
  )
}
