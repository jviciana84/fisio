"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Clock, CheckCircle, XCircle } from "lucide-react"

const schedule = [
  { day: "Lunes", hours: "9:00–13:00, 15:00–21:00", isOpen: true },
  { day: "Martes", hours: "9:00–13:00, 15:00–21:00", isOpen: true },
  { day: "Miércoles", hours: "9:00–13:00, 15:00–21:00", isOpen: true },
  { day: "Jueves", hours: "9:00–13:00, 15:00–21:00", isOpen: true },
  { day: "Viernes", hours: "9:00–13:00, 15:00–21:00", isOpen: true },
  { day: "Sábado", hours: "Cerrado", isOpen: false },
  { day: "Domingo", hours: "Cerrado", isOpen: false },
]

function getCurrentDay(): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[new Date().getDay()]
}

export function Schedule() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const currentDay = getCurrentDay()

  return (
    <section id="horarios" className="scroll-mt-24 sm:scroll-mt-28 py-14 relative overflow-hidden sm:py-16">
      {/* Animated Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-500/5 to-cyan-400/5 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center sm:mb-12"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block glass-extreme px-4 py-2 rounded-full text-sm font-medium text-blue-600 mb-4"
          >
            Horario de Atención
          </motion.span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 text-balance">
            Estamos aquí{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              para ti
            </span>
          </h2>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Visítanos en nuestro horario de atención o llámanos para agendar una cita.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-extreme rounded-3xl p-4 sm:p-8 relative overflow-hidden">
            {/* Shimmer */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-500/20 pointer-events-none" aria-hidden />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 mb-6 sm:mb-8 relative z-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md sm:h-12 sm:w-12">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 text-left">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Horario Semanal</h3>
                <p className="text-sm text-slate-500">Horario habitual de la clínica</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 relative z-10">
              {schedule.map((item, index) => (
                <motion.div
                  key={item.day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className={`flex flex-col gap-2 rounded-2xl p-3.5 transition-all sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
                    currentDay === item.day
                      ? "bg-gradient-to-r from-blue-600/10 to-cyan-500/10 border border-blue-500/30"
                      : "hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 sm:items-center">
                    {item.isOpen ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500 sm:mt-0" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400 sm:mt-0" aria-hidden />
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2">
                      <span
                        className={`font-medium ${
                          currentDay === item.day ? "text-blue-600" : "text-slate-700"
                        }`}
                      >
                        {item.day}
                      </span>
                      {currentDay === item.day ? (
                        <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs leading-none font-medium text-white">
                          Hoy
                        </span>
                      ) : null}
                      <span
                        className={`block w-full text-sm leading-snug tabular-nums sm:hidden ${item.isOpen ? "text-slate-600" : "text-red-400"}`}
                      >
                        {item.hours}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`hidden shrink-0 text-right text-sm tabular-nums sm:inline-block ${item.isOpen ? "text-slate-600" : "text-red-400"}`}
                  >
                    {item.hours}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-600/5 to-cyan-500/5 border border-blue-500/10 relative z-10"
            >
              <p className="text-sm text-slate-600 text-center">
                <span className="font-medium text-blue-600">Nota:</span> Para urgencias fuera de horario, 
                por favor contacte con nuestro servicio de atención.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
