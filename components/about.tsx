"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Award, Users, Clock, Shield } from "lucide-react"

const stats = [
  { icon: Users, value: "+500", label: "Pacientes satisfechos", color: "from-blue-600 to-blue-400" },
  { icon: Award, value: "15+", label: "Años de experiencia", color: "from-cyan-500 to-cyan-300" },
  { icon: Clock, value: "24h", label: "Respuesta rápida", color: "from-blue-500 to-cyan-400" },
  { icon: Shield, value: "100%", label: "Profesionales colegiados", color: "from-blue-600 to-cyan-500" },
]

export function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="nosotros" className="py-14 relative overflow-hidden sm:py-16">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="inline-block glass-extreme px-4 py-2 rounded-full text-sm font-medium text-blue-600 mb-4"
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

            <p className="text-lg text-slate-600 mb-8 text-pretty leading-relaxed">
              Ubicados en el corazón de Terrassa, nos enorgullece ser un referente 
              en fisioterapia en la comarca del Vallès Occidental.
            </p>

            {/* Features */}
            <div className="space-y-4">
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

          {/* Right - Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass-extreme rounded-3xl p-6 relative overflow-hidden group"
              >
                {/* Animated background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
                </div>
                
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-500 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
