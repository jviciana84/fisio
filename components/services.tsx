"use client"

import { motion, AnimatePresence, useInView } from "framer-motion"
import { useRef, useState, useEffect, useCallback, type ComponentType, type SVGProps } from "react"
import { createPortal } from "react-dom"
import {
  Activity,
  Apple,
  Bone,
  Brain,
  CircleDot,
  Dumbbell,
  Droplets,
  Hand,
  Heart,
  Orbit,
  Route,
  Sparkles,
  UserCircle2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react"
import { SectionWatermark } from "@/components/section-watermark"
import { BookingCtaLink } from "@/components/booking-cta-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type ServiceIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>
type ServiceDef = { icon: ServiceIcon; title: string; description: string; color: string }

const services: ServiceDef[] = [
  {
    icon: Activity,
    title: "Fisioterapia Deportiva",
    description: "Tratamientos especializados para lesiones deportivas y mejora del rendimiento atlético.",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Bone,
    title: "Traumatología",
    description: "Recuperación de lesiones óseas, musculares y articulares con técnicas avanzadas.",
    color: "from-cyan-500 to-cyan-300",
  },
  {
    icon: Brain,
    title: "Neurorehabilitación",
    description: "Rehabilitación neurológica para recuperar funcionalidad y calidad de vida.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Heart,
    title: "Fisioterapia Cardíaca",
    description: "Programas de rehabilitación cardiovascular supervisados por especialistas.",
    color: "from-blue-600 to-blue-500",
  },
  {
    icon: Zap,
    title: "Electroterapia",
    description: "Tratamientos con tecnología de última generación para alivio del dolor.",
    color: "from-cyan-400 to-blue-500",
  },
]

/**
 * Tratamientos en el modal ampliado: tono clínico-cercano, sin coloquialismos; textos homogéneos para cajas alineadas.
 */
const allServicesForModal: ServiceDef[] = [
  {
    icon: Activity,
    title: "Fisioterapia Deportiva",
    description:
      "Valoración, tratamiento y readaptación de lesiones y sobrecargas. Objetivo: disminuir el dolor, restablecer la movilidad y un retorno progresivo y seguro a la práctica con criterio deportivo.",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Bone,
    title: "Traumatología",
    description:
      "Rehabilitación de procesos agudos y subagudos: fracturas, esguinces, contusiones y patologías músculo-esqueléticas. Pauta personalizada, control de la carga y seguimiento para una recuperación ordenada.",
    color: "from-cyan-500 to-cyan-300",
  },
  {
    icon: Brain,
    title: "Neurorehabilitación",
    description:
      "Trabajo de motricidad, equilibrio, coordinación y control postural. Indicada en el marco de secuelas o problemas de tipo neurológico, con fines de mejora funcional y de la autonomía en actividades básicas.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Heart,
    title: "Fisioterapia Cardíaca",
    description:
      "Rehabilitación cardiovascular supervisada: ejercicio estructurado, educación terapéutica y acompañamiento, siempre bajo criterio médico y con monitorización adecuada a cada fase de recuperación.",
    color: "from-blue-600 to-blue-500",
  },
  {
    icon: Zap,
    title: "Electroterapia",
    description:
      "Aplicación de corrientes y modalidades fisiátricas (analgesia, descontracturación, activación) como complemento del tratamiento manual y del ejercicio, según criterio clínico y plan individualizado.",
    color: "from-cyan-400 to-blue-500",
  },
  {
    icon: UserCircle2,
    title: "Suelo pélvico",
    description:
      "Evaluación y abordaje de disfunciones del suelo pélvico (incontinencia, dolor, preparación o recuperación posparto, etc.) mediante técnicas conservadoras, re-educación y ejercicio orientado, respetando la sensibilidad de cada situación.",
    color: "from-rose-500 to-pink-400",
  },
  {
    icon: Apple,
    title: "Nutrición",
    description:
      "Orientación nutricional y hábitos alimentarios alineados con objetivos de salud, energía o rendimiento, evitando soluciones extremas; el abordaje se integra, cuando procede, con su plan terapéutico global.",
    color: "from-lime-500 to-emerald-500",
  },
  {
    icon: Sparkles,
    title: "Psicología deportiva",
    description:
      "Acompañamiento en ansiedad, motivación, rendimiento, gestión de la exigencia y reincorporación. Se trabaja en coordinación con el plan físico, con metas y seguimiento acordes a su contexto y disciplina.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Route,
    title: "Readaptación deportiva",
    description:
      "Fases de progresión de carga, condición física y regreso a tareas técnicas o competitivas, con criterio de riesgo y prevención de recaídas. Incluye transición del tratamiento a la sesión o competición.",
    color: "from-sky-500 to-indigo-500",
  },
  {
    icon: Wand2,
    title: "Fisioterapia funcional",
    description:
      "Reeducación de movimientos y tareas de la vida diaria, transferencia a gestos reales. Objetivo: mejora de postura, estabilidad, fuerza y confianza en acciones concretas (subir escaleras, llevar carga, etc.).",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: Orbit,
    title: "Fisioterapia vestibular",
    description:
      "Manejo de alteraciones de equilibrio, vértigo, inestabilidad y gatillos de movimiento. Trabajación vestibular y adaptación, con pauta progresiva para reducir el impacto de los episodios en su rutina y movilidad.",
    color: "from-amber-500 to-orange-400",
  },
  {
    icon: Dumbbell,
    title: "Entrenamiento",
    description:
      "Programación de fuerza, resistencia, movilidad o preparación sujeta a objetivo y a la prescripción. Intensidad y evolución se ajustan a su estado, con control de la fatiga, técnica y progresión semanal.",
    color: "from-slate-600 to-slate-400",
  },
  {
    icon: CircleDot,
    title: "Acupuntura",
    description:
      "Punción con agujas con fines fisiáteres (p. ej. dolor, tensión) según criterio clínico, normas de asepsia e indicación. Se explica riesgo/beneficio y se integra con el resto de técnicas del plan, si procede.",
    color: "from-emerald-600 to-teal-500",
  },
  {
    icon: Users,
    title: "Fisioterapia Geriátrica",
    description:
      "Prevención de caídas, mejora de la marcha, autonomía y trato a dolencias de sobrecarga o limitación. Enfoque respetuoso, adaptado a edad, comorbilidades y capacidad, con frecuencia y ejercicio acordes.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Hand,
    title: "Terapia manual",
    description:
      "Movilización articular, técnicas de tejido blando, masaje y procedimientos manuales cuyo fin es dolor, restricción o alteración miofascial. Cada intervención se justifica, gradúa y cede según su respuesta.",
    color: "from-stone-500 to-slate-500",
  },
  {
    icon: Droplets,
    title: "Drenaje linfático manual",
    description:
      "Maniobras con ritmo, presión y recorrido definidos, orientados a edemas, linfedema, postoperatorio o retención de líquidos, cuando el cuadro lo permite. Se coordinan criterio médico, frecuencia y contraindicaciones.",
    color: "from-cyan-600 to-blue-600",
  },
]

function ServiceCard({ service, index }: { service: ServiceDef; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative h-full"
      aria-label={`Servicio: ${service.title}`}
    >
      <div className="glass-extreme h-full min-h-0 rounded-3xl p-6 relative overflow-hidden transition-all duration-200 ease-out group-hover:shadow-xl group-hover:shadow-blue-500/10">
        {/* Shimmer on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-30" />
        
        {/* Gradient border effect on hover */}
        <div className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
          <div className={`absolute inset-0 bg-gradient-to-r ${service.color} opacity-20 blur-xl`} />
        </div>

        <div className="relative z-10">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 shadow-lg`}
          >
            <service.icon className="w-7 h-7 text-white" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
            {service.title}
          </h3>
          
          <p className="text-slate-600 leading-relaxed">
            {service.description}
          </p>

          <motion.div
            initial={{ width: 0 }}
            whileHover={{ width: "100%" }}
            className={`h-1 bg-gradient-to-r ${service.color} rounded-full mt-5`}
          />
        </div>
      </div>
    </motion.article>
  )
}

function MoreServicesTeaserCard({ index, onOpen }: { index: number; onOpen: () => void }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative h-full"
      aria-label="Abrir listado ampliado de servicios"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "cursor-pointer glass-extreme relative h-full w-full min-h-0 overflow-hidden rounded-3xl p-6 text-left",
          "ring-2 ring-blue-500/30 ring-offset-2 ring-offset-slate-50/80 transition-all duration-300",
          "shadow-md shadow-slate-900/5 hover:ring-[3px] hover:ring-cyan-400/80 hover:shadow-xl hover:shadow-cyan-500/25",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        )}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-400/30 blur-2xl transition-opacity duration-300 group-hover:opacity-100 group-hover:from-blue-400/50 group-hover:to-cyan-300/50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-gradient-to-tr from-cyan-400/25 to-indigo-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-100 group-hover:from-cyan-300/40 group-hover:to-indigo-400/35"
          aria-hidden
        />

        {/* Brillo suave fijo (como en las otras cards) */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-40"
          aria-hidden
        />
        {/* Aura de color al hover — destaca el bloque entero */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/15 to-indigo-500/20 blur-2xl" />
        </div>
        {/* Barrido de luz (reflejo) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
          <div className="absolute left-0 top-0 h-full w-1/2 -translate-x-full -skew-x-12 bg-gradient-to-r from-white/0 via-white/50 to-white/0 opacity-0 transition-all duration-700 ease-out will-change-transform group-hover:translate-x-[220%] group-hover:opacity-100" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-500 shadow-lg shadow-blue-500/30 transition duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cyan-500/40">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="rounded-full border border-white/50 bg-white/50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 transition duration-300 group-hover:border-cyan-300/60 group-hover:bg-cyan-50/90 group-hover:text-cyan-800">
              Descubre más
            </span>
          </div>

          <h3 className="mb-2 text-xl font-bold leading-tight text-slate-900">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent transition duration-300 group-hover:from-cyan-500 group-hover:to-indigo-500">
              Y mucho más
            </span>
          </h3>
          <p className="mb-4 text-base leading-relaxed text-slate-600 transition group-hover:text-slate-700">
            Listado completo de servicios y tratamientos del centro.
          </p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:gap-3 group-hover:text-cyan-700 transition-all">
            Ver todos los servicios
            <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </button>
    </motion.article>
  )
}

function ServicesDiscoveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="services-modal-title"
          className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center sm:p-3 md:p-4 lg:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-pointer bg-slate-900/45 backdrop-blur-md"
            aria-label="Cerrar"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 border-white/30 bg-gradient-to-b from-white/98 to-slate-50/95 shadow-2xl sm:max-h-[min(96dvh,72rem)] sm:max-w-[min(90rem,calc(100vw-1.5rem))] sm:rounded-3xl sm:border sm:border-slate-200/80"
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 flex-col gap-2 border-b border-slate-200/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5 lg:px-5">
              <div className="min-w-0 sm:pr-2">
                <h2
                  id="services-modal-title"
                  className="text-lg font-extrabold leading-tight tracking-tight text-slate-900 sm:text-xl"
                >
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Todo</span>{" "}
                  lo que podemos hacer por ti
                </h2>
                <p
                  className="mt-0.5 line-clamp-2 text-xs text-slate-600 sm:text-sm"
                  title="Tratamientos que te ayudarán a mejorar tu calidad de vida."
                >
                  Tratamientos que te ayudarán a mejorar tu calidad de vida.
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                <Button
                  asChild
                  className="h-8 rounded-full border-0 bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg hover:shadow-blue-500/30 sm:h-9 sm:px-4 sm:text-sm"
                >
                  <BookingCtaLink
                    href="/reservar"
                    onClick={onClose}
                    className="inline-flex cursor-pointer items-center justify-center"
                  >
                    Reservar cita
                  </BookingCtaLink>
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200/90 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:rounded-xl sm:p-2"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2.5 py-2.5 sm:px-3 sm:py-3 lg:px-4">
              <ul
                className="grid list-none grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 [&>li]:flex"
                role="list"
              >
                {allServicesForModal.map((s) => (
                  <li key={s.title} className="h-full min-h-0">
                    <div
                      className={cn(
                        "group flex h-full min-h-[13.5rem] flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2.5 shadow-sm sm:min-h-[12.5rem] sm:p-3",
                        "transition duration-200 ease-out",
                        "hover:-translate-y-0.5 hover:border-blue-200/80 hover:bg-white hover:shadow-md hover:shadow-blue-500/10",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                            "transition group-hover:scale-105 sm:h-9 sm:w-9 sm:rounded-lg",
                            s.color,
                          )}
                        >
                          <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <h3 className="min-h-[2.5rem] text-sm font-bold leading-tight text-slate-900 sm:min-h-[2.75rem] sm:text-[0.95rem]">
                          {s.title}
                        </h3>
                      </div>
                      <p className="mt-auto min-h-[5.75rem] flex-1 text-xs leading-snug text-slate-600 sm:min-h-[6.25rem] sm:text-sm sm:leading-relaxed line-clamp-5">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (!portalReady) return null
  return createPortal(modal, document.body)
}

export function Services() {
  const titleRef = useRef(null)
  const isInView = useInView(titleRef, { once: true })
  const [moreServicesOpen, setMoreServicesOpen] = useState(false)
  const closeMoreServices = useCallback(() => setMoreServicesOpen(false), [])

  return (
    <section
      id="servicios"
      className="scroll-mt-24 sm:scroll-mt-28 py-14 relative overflow-hidden sm:py-16"
      aria-labelledby="servicios-title"
    >
      {/* Fondo decorativo estático */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-400/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" aria-hidden />

      <SectionWatermark align="right" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-12"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block glass-extreme px-4 py-2 rounded-full text-sm font-medium text-blue-600 mb-4"
          >
            Nuestros Servicios
          </motion.span>
          
          <h2 id="servicios-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 text-balance">
            Tratamientos{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              especializados
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Ofrecemos una amplia gama de servicios de fisioterapia adaptados a tus necesidades específicas.
          </p>
        </motion.div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none" role="list" aria-label="Lista de servicios de fisioterapia">
          {services.map((service, index) => (
            <li key={service.title} className="h-full min-h-0">
              <ServiceCard service={service} index={index} />
            </li>
          ))}
          <li key="más-servicios" className="h-full min-h-0 sm:col-span-2 lg:col-span-1">
            <MoreServicesTeaserCard index={services.length} onOpen={() => setMoreServicesOpen(true)} />
          </li>
        </ul>

        <ServicesDiscoveryModal open={moreServicesOpen} onClose={closeMoreServices} />
      </div>
    </section>
  )
}
