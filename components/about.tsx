"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Award, Users, Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartCallButton } from "@/components/smart-call-button"
import { useHomeStaff } from "@/components/home-staff-context"

const stats = [
  { icon: Users, value: "+500", label: "Pacientes satisfechos", color: "from-blue-600 to-blue-400" },
  { icon: Award, value: "15+", label: "Años de experiencia", color: "from-cyan-500 to-cyan-300" },
  { icon: Clock, value: "24h", label: "Respuesta rápida", color: "from-blue-500 to-cyan-400" },
  { icon: Shield, value: "100%", label: "Profesionales", color: "from-blue-600 to-cyan-500" },
]

export function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const { openStaff } = useHomeStaff()

  return (
    <section id="nosotros" className="py-14 relative overflow-hidden sm:py-16">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <div ref={ref} className="grid gap-12 items-center lg:grid-cols-2 lg:items-stretch">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex min-h-0 flex-col lg:h-full lg:justify-between"
          >
            <div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.2 }}
                className="mb-4 inline-block w-fit max-w-max shrink-0 rounded-full glass-extreme px-4 py-2 text-sm font-medium text-blue-600"
              >
                Sobre Nosotros
              </motion.span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 text-balance">
                Cuidamos de tu salud con{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  pasión y profesionalidad
                </span>
              </h2>

              <p className="text-lg text-slate-600 mb-6 text-pretty leading-relaxed">
                En Fisioterapia Roc Blanc, llevamos más de 15 años dedicados a mejorar 
                la calidad de vida de nuestros pacientes. Nuestro equipo de profesionales 
                altamente cualificados utiliza las técnicas más avanzadas y un enfoque 
                personalizado para cada tratamiento.
              </p>

              <p className="text-lg text-slate-600 mb-0 text-pretty leading-relaxed lg:mb-0">
                Ubicados en el corazón de Terrassa, nos enorgullece ser un referente 
                en fisioterapia en la comarca del Vallès Occidental.
              </p>
            </div>

            {/* Features: abajo en lg para alinear con botones de la derecha */}
            <div className="mt-8 space-y-4 lg:mt-0 lg:shrink-0">
              {[
                "Tratamientos personalizados para cada paciente",
                "Equipamiento de última generación",
                "Seguimiento continuo de tu evolución",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Stats Grid + CTA staff */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex min-h-0 w-full flex-col gap-3 lg:h-full lg:gap-3 lg:pt-[3.35rem]"
          >
            <div className="grid min-h-0 w-full flex-1 grid-cols-2 gap-3 [grid-template-rows:repeat(2,minmax(0,1fr))] sm:gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{
                    y: -4,
                    scale: 1.015,
                    transition: { duration: 0.18, ease: "easeOut" },
                  }}
                  className="glass-extreme group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-3xl p-6 sm:min-h-[172px] sm:p-7 lg:min-h-[10.25rem] lg:p-8"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
                  </div>

                  {/* Shimmer */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-25" />

                  <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
                    <div
                      className={`mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br sm:mb-5 sm:h-14 sm:w-14 ${stat.color}`}
                    >
                      <stat.icon className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                    </div>

                    <div>
                      <div className="mb-1 text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent sm:text-4xl">
                        {stat.value}
                      </div>
                      <div className="text-sm leading-snug text-slate-600 sm:text-base">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex w-full shrink-0 flex-row items-center gap-2">
              <Button
                type="button"
                onClick={openStaff}
                className="h-8 min-w-0 flex-1 gap-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-2 text-[11px] font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-cyan-600 sm:px-2.5 sm:text-xs"
              >
                <span className="min-w-0 truncate">Conoce nuestro Staff</span>
                <Users className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              </Button>
              <SmartCallButton className="h-8 shrink-0 rounded-full border-white/50 bg-white/60 px-2 text-[11px] text-slate-700 shadow-sm hover:bg-white/80 sm:px-2.5 sm:text-xs" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
