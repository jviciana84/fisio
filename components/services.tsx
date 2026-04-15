"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Activity, Zap, Heart, Users, Brain, Bone } from "lucide-react"

const services = [
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
  {
    icon: Users,
    title: "Fisioterapia Geriátrica",
    description: "Atención especializada para mantener la movilidad y autonomía en adultos mayores.",
    color: "from-blue-500 to-cyan-500",
  },
]

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative"
      aria-label={`Servicio: ${service.title}`}
    >
      <div className="glass-extreme rounded-3xl p-6 h-full relative overflow-hidden transition-all duration-500 group-hover:shadow-xl group-hover:shadow-blue-500/10">
        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-r from-white/0 via-white/40 to-white/0 pointer-events-none" />
        
        {/* Gradient border effect on hover */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
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

export function Services() {
  const titleRef = useRef(null)
  const isInView = useInView(titleRef, { once: true })

  return (
    <section id="servicios" className="py-24 relative overflow-hidden" aria-labelledby="servicios-title">
      {/* Fondo decorativo estático */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-400/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
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
            <li key={service.title}>
              <ServiceCard service={service} index={index} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
