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
    <section id="horarios" className="scroll-mt-24 py-14 relative overflow-hidden sm:py-16">
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
          <div className="glass-extreme rounded-3xl p-8 relative overflow-hidden">
            {/* Shimmer */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-500/20 pointer-events-none" aria-hidden />

            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Horario Semanal</h3>
                <p className="text-sm text-slate-500">Horario habitual de la clínica</p>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {schedule.map((item, index) => (
                <motion.div
                  key={item.day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                    currentDay === item.day
                      ? "bg-gradient-to-r from-blue-600/10 to-cyan-500/10 border border-blue-500/30"
                      : "hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.isOpen ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-medium ${currentDay === item.day ? "text-blue-600" : "text-slate-700"}`}>
                      {item.day}
                      {currentDay === item.day && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          Hoy
                        </span>
                      )}
                    </span>
                  </div>
                  <span className={`text-sm ${item.isOpen ? "text-slate-600" : "text-red-400"}`}>
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
