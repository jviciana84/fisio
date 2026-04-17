"use client"

import { motion, useInView, useReducedMotion } from "framer-motion"
import { useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Check, Sparkles, Clock, Gift, Zap, Crown, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

type Bono = (typeof bonos)[number]

function PricingCard({ bono, index, onBuy }: { bono: Bono; index: number; onBuy: (bono: Bono) => void }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [isHovered, setIsHovered] = useState(false)
  const reduceMotion = useReducedMotion()

  const borderBreathe = bono.popular && !reduceMotion && !isHovered

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
        bono.popular
          ? "border border-blue-200/35 shadow-lg shadow-blue-500/10"
          : "border border-white/40"
      }`}
    >
      {/* Fondo suave (opacidad fija; el “respirar” va en el borde) */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${bono.color} ${
          bono.popular ? "opacity-[0.08]" : "opacity-[0.05]"
        }`}
        aria-hidden
      />

      {/* Borde animado solo en el bono popular (no altera el tamaño del card) */}
      {bono.popular ? (
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
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1 }}
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
              bono.popular
                ? `bg-gradient-to-r ${bono.color} text-white shadow-lg ${bono.shadowColor} hover:shadow-xl hover:shadow-blue-500/40`
                : "glass-extreme border-2 border-blue-500/20 text-blue-600 hover:bg-blue-50/50 hover:border-blue-500/40"
            }`}
          >
            <Gift className="w-5 h-5 mr-2" />
            Comprar Bono
          </Button>
        </motion.div>
      </div>

      {/* Línea inferior solo en no-popular; el popular ya tiene el acento en el borde */}
      {!bono.popular && (
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
      initial={{ opacity: 0, y: 80, rotateX: 15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 100 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group ${bono.popular ? "z-10" : ""}`}
    >
      {cardBody}
    </motion.div>
  )
}

export function Pricing() {
  const titleRef = useRef(null)
  const isInView = useInView(titleRef, { once: true })
  const [selectedBono, setSelectedBono] = useState<Bono | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    acceptedPolicy: false,
  })
  const [paymentView, setPaymentView] = useState<"form" | "paypal_unavailable" | "bizum">("form")
  const [isRegisteringLead, setIsRegisteringLead] = useState(false)
  const [leadError, setLeadError] = useState("")

  const isPurchaseFormComplete =
    purchaseForm.name.trim() &&
    purchaseForm.lastName.trim() &&
    purchaseForm.email.trim() &&
    purchaseForm.phone.trim() &&
    purchaseForm.address.trim() &&
    purchaseForm.acceptedPolicy

  const openPurchaseModal = (bono: Bono) => {
    setSelectedBono(bono)
    setPaymentView("form")
    setLeadError("")
  }

  const closePurchaseModal = () => {
    setSelectedBono(null)
    setPaymentView("form")
    setLeadError("")
  }

  const handlePurchaseChange = (field: keyof typeof purchaseForm, value: string | boolean) => {
    setPurchaseForm((prev) => ({ ...prev, [field]: value }))
  }

  const registerLeadAndFlip = async (paymentMethod: "bizum" | "paypal") => {
    if (!selectedBono) return
    setLeadError("")
    setIsRegisteringLead(true)
    try {
      const res = await fetch("/api/bonos/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: purchaseForm.name.trim(),
          lastName: purchaseForm.lastName.trim(),
          email: purchaseForm.email.trim(),
          phone: purchaseForm.phone.trim(),
          address: purchaseForm.address.trim(),
          bonoSessions: selectedBono.sessions,
          bonoPrice: selectedBono.price,
          paymentMethod,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (!res.ok || !data.ok) {
        setLeadError(data.message ?? "No se pudo registrar tus datos.")
        return
      }
      setPaymentView(paymentMethod === "bizum" ? "bizum" : "paypal_unavailable")
    } catch {
      setLeadError("No pudimos registrar tus datos. Inténtalo de nuevo.")
    } finally {
      setIsRegisteringLead(false)
    }
  }

  return (
    <section id="bonos" className="py-14 relative overflow-hidden sm:py-16" aria-labelledby="bonos-title">
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
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

                        <div>
                          <label htmlFor="purchase-address" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Dirección
                          </label>
                          <Input
                            id="purchase-address"
                            value={purchaseForm.address}
                            onChange={(e) => handlePurchaseChange("address", e.target.value)}
                            placeholder="Calle, número, ciudad y código postal"
                            className="bg-white"
                            required
                          />
                        </div>

                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={purchaseForm.acceptedPolicy}
                            onChange={(e) => handlePurchaseChange("acceptedPolicy", e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <span className="text-pretty leading-snug">
                            Acepto la política de privacidad y el tratamiento de mis datos para gestionar la compra del bono.
                          </span>
                        </label>

                        <div className="grid gap-3 pt-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            onClick={() => registerLeadAndFlip("bizum")}
                            disabled={!isPurchaseFormComplete || isRegisteringLead}
                            className="h-12 rounded-xl bg-[#2D7CF6] text-white hover:bg-[#1f68db] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/images/bizum-logo.ico"
                              alt="Logo Bizum"
                              className="mr-2 h-5 w-5 rounded-sm bg-white/95 p-[2px]"
                            />
                            {isRegisteringLead ? "Registrando..." : "Pagar con Bizum"}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => registerLeadAndFlip("paypal")}
                            disabled={!isPurchaseFormComplete || isRegisteringLead}
                            className="h-12 rounded-xl bg-[#0070BA] text-white hover:bg-[#005e9d] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/images/paypal-logo.svg"
                              alt="Logo PayPal"
                              className="mr-2 h-6 w-6 rounded-md bg-white p-1 shadow-sm"
                            />
                            {isRegisteringLead ? "Registrando..." : "Pagar con PayPal"}
                          </Button>
                        </div>
                        {leadError ? (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{leadError}</p>
                        ) : null}
                      </form>
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
                            <p className="mt-3 max-w-md rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white">
                              Si contratas los bonos en la clínica, tendrás descuentos especiales.
                            </p>
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
                            <p className="mt-3 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white">
                              Si contratas los bonos en la clínica, tendrás descuentos especiales.
                            </p>
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
