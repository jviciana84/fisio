"use client"

import { motion, useInView, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Check, Sparkles, Clock, Gift, Zap, Crown, Star, X, ChevronLeft, ChevronRight } from "lucide-react"
import { BonoSignaturePad, type BonoSignaturePadHandle } from "@/components/bono-signature-pad"
import { bonosWebRequireSignature } from "@/lib/bonos/web-signature-flag"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LegalConsentCheckboxText } from "@/components/legal-consent-checkbox-text"
import { cn } from "@/lib/cn"

function ClinicDiscountHighlight({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "relative mt-3 overflow-hidden rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white",
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <span className="absolute -inset-y-4 -left-[20%] w-[55%] min-w-[10rem] -skew-x-[22deg] bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-95 animate-clinic-discount-shimmer" />
      </span>
      <span className="relative z-10 block">Si contratas los bonos en la clínica, tendrás descuentos especiales.</span>
    </p>
  )
}

const bonos = [
  {
    sessions: 3,
    price: 132,
    pricePerSession: 44,
    popular: false,
    icon: Zap,
    color: "from-cyan-500 to-blue-500",
    shadowColor: "shadow-cyan-500/20",
    features: [
      "3 sesiones de fisioterapia",
      "Valoración inicial incluida",
      "Validez 1 año",
      "Horario flexible",
    ],
  },
  {
    sessions: 6,
    price: 231,
    pricePerSession: 38.5,
    popular: true,
    icon: Crown,
    color: "from-blue-600 to-cyan-400",
    shadowColor: "shadow-blue-500/30",
    features: [
      "6 sesiones de fisioterapia",
      "Valoración inicial incluida",
      "Validez 1 año",
      "Horario flexible",
      "Seguimiento personalizado",
      "Ahorra 30 euros",
    ],
  },
  {
    sessions: 10,
    price: 440,
    pricePerSession: 44,
    popular: false,
    icon: Star,
    color: "from-blue-700 to-blue-400",
    shadowColor: "shadow-blue-600/20",
    features: [
      "10 sesiones de fisioterapia",
      "Valoración inicial incluida",
      "Validez 1 año",
      "Horario prioritario",
      "Seguimiento personalizado",
      "Plan de ejercicios incluido",
      "Ahorra 50 euros",
    ],
  },
]

function bonoStepDirection(oldIndex: number, newIndex: number, len: number) {
  if (oldIndex === newIndex) return 1
  const forward = (newIndex - oldIndex + len) % len
  const backward = (oldIndex - newIndex + len) % len
  return forward <= backward ? 1 : -1
}

type Bono = (typeof bonos)[number]

type PricingCardVariant = "grid" | "carousel"

function PricingCard({
  bono,
  index,
  onBuy,
  variant = "grid",
}: {
  bono: Bono
  index: number
  onBuy: (bono: Bono) => void
  variant?: PricingCardVariant
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [isHovered, setIsHovered] = useState(false)
  const reduceMotion = useReducedMotion()

  const showPopularLook = bono.popular || variant === "carousel"
  const borderBreathe = showPopularLook && !reduceMotion && !isHovered

  const cardBody = (
    <motion.div
      animate={
        bono.popular && isHovered
          ? { y: -10, scale: 1.03 }
          : isHovered
            ? { y: -10, scale: 1.02 }
            : { y: 0, scale: 1 }
      }
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={`relative overflow-hidden rounded-3xl glass-extreme ${
        showPopularLook
          ? "border border-blue-200/35 shadow-lg shadow-blue-500/10"
          : "border border-white/40"
      }`}
    >
      {/* Fondo suave (opacidad fija; el “respirar” va en el borde) */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${bono.color} ${
          showPopularLook ? "opacity-[0.08]" : "opacity-[0.05]"
        }`}
        aria-hidden
      />

      {/* Borde animado (popular o todos en carrusel móvil) */}
      {showPopularLook ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] rounded-3xl"
          animate={
            borderBreathe
              ? {
                  opacity: [0.45, 1],
                  boxShadow: [
                    "inset 0 0 0 2px rgba(56, 189, 248, 0.35), inset 0 0 24px rgba(59, 130, 246, 0.06)",
                    "inset 0 0 0 2px rgba(56, 189, 248, 0.95), inset 0 0 32px rgba(59, 130, 246, 0.14)",
                  ],
                }
              : {
                  opacity: isHovered ? 1 : 0.8,
                  boxShadow:
                    "inset 0 0 0 2px rgba(56, 189, 248, 0.75), inset 0 0 20px rgba(59, 130, 246, 0.1)",
                }
          }
          transition={
            borderBreathe
              ? {
                  duration: 2.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: [0.45, 0, 0.55, 1],
                }
              : { duration: 0.2 }
          }
        />
      ) : null}

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={isHovered ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5 }}
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${bono.color} mb-5 shadow-lg ${bono.shadowColor}`}
          >
            <bono.icon className="w-8 h-8 text-white" />
          </motion.div>

          <motion.div
            animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Bono {bono.sessions} Sesiones
            </h3>
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Validez 1 año</span>
            </div>
          </motion.div>
        </div>

        {/* Price */}
        <div className="text-center mb-8">
          <motion.div
            animate={isHovered ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="relative inline-block"
          >
            <span className="text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
              {bono.price}
            </span>
            <span className="text-2xl font-bold text-slate-400 ml-1">euros</span>
          </motion.div>

          <div className="mt-2">
            <span className="inline-block glass px-3 py-1 rounded-full text-sm font-medium text-blue-600">
              {bono.pricePerSession} euros/sesión
            </span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-8">
          {bono.features.map((feature, i) => (
            <motion.li
              key={feature}
              initial={variant === "carousel" ? false : { opacity: 0, x: -20 }}
              animate={variant === "carousel" || isInView ? { opacity: 1, x: 0 } : {}}
              transition={variant === "carousel" ? { duration: 0 } : { delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-3"
            >
              <motion.div
                animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                transition={{ delay: i * 0.05 }}
                className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${bono.color} flex items-center justify-center mt-0.5`}
              >
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </motion.div>
              <span className="text-slate-700">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="button"
            onClick={() => onBuy(bono)}
            className={`w-full py-6 text-lg font-semibold rounded-2xl transition-all duration-300 ${
              showPopularLook
                ? `bg-gradient-to-r ${bono.color} text-white shadow-lg ${bono.shadowColor} hover:shadow-xl hover:shadow-blue-500/40`
                : "glass-extreme border-2 border-blue-500/20 text-blue-600 hover:bg-blue-50/50 hover:border-blue-500/40"
            }`}
          >
            <Gift className="w-5 h-5 mr-2" />
            Comprar Bono
          </Button>
        </motion.div>
      </div>

      {/* Línea inferior solo en no-popular; el look “destacado” ya lleva el borde */}
      {!showPopularLook && (
        <motion.div
          animate={{ opacity: isHovered ? 1 : 0.5, scaleX: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-3/4 bg-gradient-to-r ${bono.color} rounded-full blur-sm`}
        />
      )}
    </motion.div>
  )

  return (
    <motion.div
      ref={ref}
      initial={
        variant === "carousel"
          ? { opacity: 1, y: 0, rotateX: 0 }
          : { opacity: 0, y: 80, rotateX: 15 }
      }
      animate={variant === "carousel" || isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={
        variant === "carousel"
          ? { duration: 0 }
          : { duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 100 }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative group", showPopularLook ? "z-10" : "")}
    >
      {cardBody}
    </motion.div>
  )
}

export function Pricing() {
  /** `NEXT_PUBLIC_BONOS_WEB_REQUIRE_SIGNATURE=true` → lienzo de firma; por defecto solo casilla RGPD */
  const requireWebSignature = bonosWebRequireSignature()
  const titleRef = useRef(null)
  const isInView = useInView(titleRef, { once: true })
  const [selectedBono, setSelectedBono] = useState<Bono | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressNumber: "",
    addressPostalCode: "",
    addressCity: "",
    acceptedPolicy: false,
  })
  const [paymentView, setPaymentView] = useState<"form" | "signature" | "paypal_unavailable" | "bizum">("form")
  const [pendingPayment, setPendingPayment] = useState<"bizum" | "paypal" | null>(null)
  const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false)
  const signatureRef = useRef<BonoSignaturePadHandle>(null)
  const [isRegisteringLead, setIsRegisteringLead] = useState(false)
  const [isCheckingReuse, setIsCheckingReuse] = useState(false)
  const [leadError, setLeadError] = useState("")
  const [currentBonoIndex, setCurrentBonoIndex] = useState(0)
  /** 1 = al siguiente bono (slide hacia la izquierda), -1 = al anterior (slide hacia la derecha) */
  const [bonoSlideDirection, setBonoSlideDirection] = useState(1)
  const touchStartXRef = useRef<number | null>(null)
  const bonoAutoplayResumeAtRef = useRef(0)
  const mobileBonoCarouselRef = useRef<HTMLDivElement | null>(null)
  const bonoCarouselInView = useInView(mobileBonoCarouselRef, { amount: 0.3, once: false })
  const reduceMotion = useReducedMotion()

  const BONO_AUTOPLAY_MS = 5500
  const BONO_AUTOPLAY_USER_PAUSE_MS = 22000

  const pauseBonoAutoplay = useCallback(
    (ms: number = BONO_AUTOPLAY_USER_PAUSE_MS) => {
      bonoAutoplayResumeAtRef.current = Date.now() + ms
    },
    [BONO_AUTOPLAY_USER_PAUSE_MS],
  )

  const tickNextBono = useCallback(() => {
    setBonoSlideDirection(1)
    setCurrentBonoIndex((prev) => (prev + 1) % bonos.length)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    if (selectedBono) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      if (!bonoCarouselInView) return
      if (Date.now() < bonoAutoplayResumeAtRef.current) return
      tickNextBono()
    }, BONO_AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [BONO_AUTOPLAY_MS, bonoCarouselInView, reduceMotion, selectedBono, tickNextBono])

  const isPurchaseFormComplete =
    purchaseForm.name.trim() &&
    purchaseForm.lastName.trim() &&
    purchaseForm.email.trim() &&
    purchaseForm.phone.trim() &&
    purchaseForm.addressStreet.trim() &&
    purchaseForm.addressNumber.trim() &&
    purchaseForm.addressPostalCode.trim() &&
    purchaseForm.addressCity.trim() &&
    purchaseForm.acceptedPolicy

  const openPurchaseModal = (bono: Bono) => {
    setSelectedBono(bono)
    setPaymentView("form")
    setLeadError("")
    setIsCheckingReuse(false)
  }

  const closePurchaseModal = () => {
    setSelectedBono(null)
    setPaymentView("form")
    setPendingPayment(null)
    setHasSignatureDrawing(false)
    setLeadError("")
    signatureRef.current?.clear()
  }

  const handlePurchaseChange = (field: keyof typeof purchaseForm, value: string | boolean) => {
    setPurchaseForm((prev) => ({ ...prev, [field]: value }))
  }

  const goToSignatureStep = async (method: "bizum" | "paypal") => {
    if (!isPurchaseFormComplete) return
    setLeadError("")
    if (!requireWebSignature) {
      await registerLeadAndFlip(method)
      return
    }
    setIsCheckingReuse(true)
    try {
      const check = await fetch("/api/bonos/signature-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: purchaseForm.name.trim(),
          lastName: purchaseForm.lastName.trim(),
          email: purchaseForm.email.trim(),
          phone: purchaseForm.phone.trim(),
        }),
      })
      const checkData = (await check.json()) as { ok?: boolean; skipSignature?: boolean; message?: string }
      if (!check.ok) {
        setLeadError(checkData.message ?? "No se pudo comprobar si ya existe tu firma.")
        return
      }
      if (checkData.skipSignature) {
        await registerLeadAndFlip(method, { reuseWebSignature: true })
        return
      }
      setPendingPayment(method)
      setHasSignatureDrawing(false)
      setPaymentView("signature")
    } catch {
      setLeadError("No se pudo comprobar tus datos. Inténtalo de nuevo.")
    } finally {
      setIsCheckingReuse(false)
    }
  }

  const registerLeadAndFlip = async (
    paymentMethod: "bizum" | "paypal",
    opts?: { reuseWebSignature?: boolean },
  ) => {
    if (!selectedBono) return
    const reuse = requireWebSignature && opts?.reuseWebSignature === true
    const signaturePngBase64 = requireWebSignature && !reuse ? signatureRef.current?.toDataUrl() : null
    if (requireWebSignature && !reuse && !signaturePngBase64) {
      setLeadError("Firma obligatoria: dibuja tu firma en el recuadro.")
      return
    }
    setLeadError("")
    setIsRegisteringLead(true)
    try {
      const base = {
        name: purchaseForm.name.trim(),
        lastName: purchaseForm.lastName.trim(),
        email: purchaseForm.email.trim(),
        phone: purchaseForm.phone.trim(),
        addressStreet: purchaseForm.addressStreet.trim(),
        addressNumber: purchaseForm.addressNumber.trim(),
        addressPostalCode: purchaseForm.addressPostalCode.trim(),
        addressCity: purchaseForm.addressCity.trim(),
        bonoSessions: selectedBono.sessions,
        bonoPrice: selectedBono.price,
        paymentMethod,
      }
      const res = await fetch("/api/bonos/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...base,
          ...(reuse ? { reuseWebSignature: true } : {}),
          ...(requireWebSignature && !reuse && signaturePngBase64 ? { signaturePngBase64 } : {}),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (!res.ok || !data.ok) {
        setLeadError(data.message ?? "No se pudo registrar tus datos.")
        return
      }
      setPendingPayment(null)
      setPaymentView(paymentMethod === "bizum" ? "bizum" : "paypal_unavailable")
    } catch {
      setLeadError("No pudimos registrar tus datos. Inténtalo de nuevo.")
    } finally {
      setIsRegisteringLead(false)
    }
  }

  const goToNextBono = () => {
    setBonoSlideDirection(1)
    setCurrentBonoIndex((prev) => (prev + 1) % bonos.length)
  }

  const goToPrevBono = () => {
    setBonoSlideDirection(-1)
    setCurrentBonoIndex((prev) => (prev - 1 + bonos.length) % bonos.length)
  }

  const userGoNextBono = () => {
    pauseBonoAutoplay()
    goToNextBono()
  }

  const userGoPrevBono = () => {
    pauseBonoAutoplay()
    goToPrevBono()
  }

  const handleCarouselTouchStart = (clientX: number) => {
    touchStartXRef.current = clientX
    pauseBonoAutoplay()
  }

  const handleCarouselTouchEnd = (clientX: number) => {
    if (touchStartXRef.current === null) return
    const delta = clientX - touchStartXRef.current
    const swipeThreshold = 40
    if (delta > swipeThreshold) {
      goToPrevBono()
    } else if (delta < -swipeThreshold) {
      goToNextBono()
    }
    touchStartXRef.current = null
  }

  return (
    <section
      id="bonos"
      className="scroll-mt-24 sm:scroll-mt-28 py-14 relative overflow-hidden sm:py-16"
      aria-labelledby="bonos-title"
    >
      {/* Fondo decorativo estático (sin animación continua) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-10 sm:mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 glass-extreme px-5 py-2.5 rounded-full text-sm font-medium text-blue-600 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Ahorra con nuestros bonos
            <Sparkles className="w-4 h-4" />
          </motion.span>

          <h2 id="bonos-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 text-balance">
            Bonos de{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Sesiones
              </span>
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full" />
            </span>
          </h2>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Invierte en tu salud con nuestros bonos de sesiones. 
            Mayor ahorro y flexibilidad para tu tratamiento de fisioterapia.
          </p>
        </motion.div>

        {/* Pricing Cards mobile: carrusel horizontal infinito */}
        <div ref={mobileBonoCarouselRef} className="md:hidden mx-auto max-w-xl">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
            <p className="text-xs font-medium text-slate-600">Desliza para ver m&aacute;s bonos</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={userGoPrevBono}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
                aria-label="Ver bono anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={userGoNextBono}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
                aria-label="Ver siguiente bono"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="relative overflow-hidden"
            onTouchStart={(e) => handleCarouselTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => handleCarouselTouchEnd(e.changedTouches[0].clientX)}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white/80 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white/80 to-transparent"
            />
            <AnimatePresence custom={bonoSlideDirection} initial={false}>
              <motion.div
                key={bonos[currentBonoIndex].sessions}
                className="w-full"
                custom={bonoSlideDirection}
                variants={{
                  enter: (d: number) =>
                    reduceMotion
                      ? { x: 0, opacity: 0 }
                      : { x: d > 0 ? "100%" : "-100%", opacity: 0.5 },
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) =>
                    reduceMotion
                      ? { x: 0, opacity: 0 }
                      : { x: d > 0 ? "-100%" : "100%", opacity: 0.5 },
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: "tween",
                  duration: reduceMotion ? 0.15 : 0.32,
                  ease: [0.32, 0.72, 0, 1],
                }}
              >
                <PricingCard
                  variant="carousel"
                  bono={bonos[currentBonoIndex]}
                  index={0}
                  onBuy={openPurchaseModal}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2" aria-label="Indicador de bonos">
            {bonos.map((bono, idx) => (
              <button
                key={bono.sessions}
                type="button"
                onClick={() => {
                  if (idx === currentBonoIndex) return
                  pauseBonoAutoplay()
                  setBonoSlideDirection(bonoStepDirection(currentBonoIndex, idx, bonos.length))
                  setCurrentBonoIndex(idx)
                }}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  idx === currentBonoIndex ? "w-6 bg-blue-600" : "w-2.5 bg-slate-300 hover:bg-slate-400",
                )}
                aria-label={`Ir al bono ${bono.sessions} sesiones`}
                aria-current={idx === currentBonoIndex ? "true" : undefined}
              />
            ))}
          </div>
        </div>

        {/* Pricing Cards desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
          {bonos.map((bono, index) => (
            <PricingCard key={bono.sessions} bono={bono} index={index} onBuy={openPurchaseModal} />
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-wrap justify-center gap-6"
        >
          {[
            { icon: Check, text: "Pago seguro" },
            { icon: Clock, text: "Validez 1 año" },
            { icon: Gift, text: "Transferible" },
          ].map((badge) => (
            <motion.div
              key={badge.text}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 glass-extreme px-5 py-3 rounded-full"
            >
              <badge.icon className="w-5 h-5 text-blue-600" />
              <span className="text-slate-700 font-medium">{badge.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedBono ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center sm:py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={closePurchaseModal}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
              aria-label="Cerrar modal de compra"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="purchase-modal-title"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/95 shadow-2xl backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={closePurchaseModal}
                className="absolute right-3 top-3 z-20 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-900"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pt-12 sm:p-7 sm:pt-14">
                <AnimatePresence mode="wait" initial={false}>
                  {paymentView === "form" ? (
                    <motion.div
                      key="purchase-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-5 pr-10">
                        <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Compra de bono
                        </p>
                        <h3 id="purchase-modal-title" className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                          Bono {selectedBono.sessions} sesiones · {selectedBono.price} euros
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Completa tus datos y elige cómo quieres pagar.
                        </p>
                      </div>

                      <form className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="purchase-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Nombre
                            </label>
                            <Input
                              id="purchase-name"
                              value={purchaseForm.name}
                              onChange={(e) => handlePurchaseChange("name", e.target.value)}
                              placeholder="Tu nombre"
                              className="bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="purchase-last-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Apellidos
                            </label>
                            <Input
                              id="purchase-last-name"
                              value={purchaseForm.lastName}
                              onChange={(e) => handlePurchaseChange("lastName", e.target.value)}
                              placeholder="Tus apellidos"
                              className="bg-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="purchase-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Email
                            </label>
                            <Input
                              id="purchase-email"
                              type="email"
                              value={purchaseForm.email}
                              onChange={(e) => handlePurchaseChange("email", e.target.value)}
                              placeholder="tu@email.com"
                              className="bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="purchase-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Teléfono
                            </label>
                            <Input
                              id="purchase-phone"
                              type="tel"
                              value={purchaseForm.phone}
                              onChange={(e) => handlePurchaseChange("phone", e.target.value)}
                              placeholder="600 000 000"
                              className="bg-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="purchase-address-street" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Calle
                            </label>
                            <Input
                              id="purchase-address-street"
                              value={purchaseForm.addressStreet}
                              onChange={(e) => handlePurchaseChange("addressStreet", e.target.value)}
                              placeholder="Calle"
                              className="bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="purchase-address-number" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Nº
                            </label>
                            <Input
                              id="purchase-address-number"
                              value={purchaseForm.addressNumber}
                              onChange={(e) => handlePurchaseChange("addressNumber", e.target.value)}
                              placeholder="12, 3ºA…"
                              className="bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="purchase-address-postal" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Código postal
                            </label>
                            <Input
                              id="purchase-address-postal"
                              value={purchaseForm.addressPostalCode}
                              onChange={(e) => handlePurchaseChange("addressPostalCode", e.target.value)}
                              placeholder="08221"
                              className="bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="purchase-address-city" className="mb-1.5 block text-sm font-medium text-slate-700">
                              Población
                            </label>
                            <Input
                              id="purchase-address-city"
                              value={purchaseForm.addressCity}
                              onChange={(e) => handlePurchaseChange("addressCity", e.target.value)}
                              placeholder="Terrassa"
                              className="bg-white"
                              required
                            />
                          </div>
                        </div>

                        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={purchaseForm.acceptedPolicy}
                            onChange={(e) => handlePurchaseChange("acceptedPolicy", e.target.checked)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <LegalConsentCheckboxText />
                        </label>

                        <div className="grid gap-3 pt-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            onClick={() => void goToSignatureStep("bizum")}
                            disabled={!isPurchaseFormComplete || isRegisteringLead || isCheckingReuse}
                            className="h-12 rounded-xl bg-[#2D7CF6] text-white hover:bg-[#1f68db] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/images/bizum-logo.ico"
                              alt="Logo Bizum"
                              className="mr-2 h-5 w-5 rounded-sm bg-white/95 p-[2px]"
                            />
                            {requireWebSignature
                              ? isCheckingReuse
                                ? "Comprobando…"
                                : "Siguiente: firma"
                              : isRegisteringLead
                                ? "Registrando…"
                                : "Pagar con Bizum"}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void goToSignatureStep("paypal")}
                            disabled={!isPurchaseFormComplete || isRegisteringLead || isCheckingReuse}
                            className="h-12 rounded-xl bg-[#0070BA] text-white hover:bg-[#005e9d] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/images/paypal-logo.svg"
                              alt="Logo PayPal"
                              className="mr-2 h-6 w-6 rounded-md bg-white p-1 shadow-sm"
                            />
                            {requireWebSignature
                              ? isCheckingReuse
                                ? "Comprobando…"
                                : "Siguiente: firma"
                              : isRegisteringLead
                                ? "Registrando…"
                                : "Pagar con PayPal"}
                          </Button>
                        </div>
                        {leadError ? (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{leadError}</p>
                        ) : null}
                      </form>
                    </motion.div>
                  ) : paymentView === "signature" && pendingPayment ? (
                    <motion.div
                      key="purchase-signature"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="mb-2 pr-8">
                        <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Firma manuscrita
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-slate-900">Firma en el recuadro</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Usa el ratón o el dedo. Después podrás enviar la solicitud (
                          {pendingPayment === "bizum" ? "Bizum" : "PayPal"}).
                        </p>
                      </div>
                      <BonoSignaturePad
                        ref={signatureRef}
                        key={pendingPayment + (selectedBono?.sessions ?? 0)}
                        onDrawingChange={setHasSignatureDrawing}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => signatureRef.current?.clear()}
                        >
                          Limpiar firma
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setPaymentView("form")
                            setPendingPayment(null)
                            setHasSignatureDrawing(false)
                          }}
                        >
                          Volver
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void registerLeadAndFlip(pendingPayment)}
                        disabled={!hasSignatureDrawing || isRegisteringLead}
                        className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRegisteringLead ? "Enviando…" : "Confirmar y enviar solicitud"}
                      </Button>
                      {leadError ? (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{leadError}</p>
                      ) : null}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="purchase-result"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-600 p-6 text-white sm:p-8"
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        {paymentView === "paypal_unavailable" ? (
                          <>
                            <img
                              src="/images/paypal-logo.svg"
                              alt="Logo PayPal"
                              className="mb-5 h-14 w-14 rounded-xl bg-white p-2 shadow-lg"
                            />
                            <h4 className="text-xl font-bold sm:text-2xl">PayPal todavía no está disponible</h4>
                            <p className="mt-3 max-w-md text-pretty text-white/95">
                              Disculpa las molestias. Estamos trabajando para tener PayPal habilitado lo antes posible.
                            </p>
                            <ClinicDiscountHighlight className="max-w-md" />
                            <p className="mt-3 max-w-md text-pretty text-sm text-white/90">
                              Hemos guardado tus datos y te llamaremos desde la clínica para ayudarte con la contratación.
                            </p>
                            <Button
                              type="button"
                              onClick={() => setPaymentView("form")}
                              className="mt-8 rounded-xl bg-white/20 px-6 text-white hover:bg-white/30"
                            >
                              Volver a métodos de pago
                            </Button>
                          </>
                        ) : (
                          <div className="w-full max-w-md text-center">
                            <img
                              src="/images/bizum-logo.ico"
                              alt="Logo Bizum"
                              className="mx-auto mb-5 h-14 w-14 rounded-xl bg-white p-2 shadow-lg"
                            />
                            <h4 className="text-xl font-bold sm:text-2xl">Bizum todavía no está disponible</h4>
                            <p className="mt-3 text-pretty text-white/95">
                              Disculpa las molestias. Estamos trabajando para tener Bizum habilitado lo antes posible.
                            </p>
                            <ClinicDiscountHighlight />
                            <p className="mt-3 text-pretty text-sm text-white/90">
                              Hemos guardado tus datos y te llamaremos desde la clínica para ayudarte con la contratación.
                            </p>
                            <Button
                              type="button"
                              onClick={() => setPaymentView("form")}
                              className="mt-8 rounded-xl bg-white/20 px-6 text-white hover:bg-white/30"
                            >
                              Volver a métodos de pago
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
