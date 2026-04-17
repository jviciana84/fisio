"use client"

import { motion, useInView, useReducedMotion } from "framer-motion"
import { useRef, useState } from "react"
import { Check, Sparkles, Clock, Gift, Zap, Crown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

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

function PricingCard({ bono, index }: { bono: typeof bonos[0]; index: number }) {
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
            <PricingCard key={bono.sessions} bono={bono} index={index} />
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
    </section>
  )
}
