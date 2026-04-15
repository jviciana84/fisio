"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star, MapPin, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartCallButton } from "@/components/smart-call-button"

export function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-labelledby="hero-title" role="banner">
      {/* Fondo: mesh estático (sin animación CSS infinita en toda la pantalla) */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Orbes decorativos estáticos: mismo look, sin repaints por frame */}
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-gradient-to-br from-blue-400/30 to-cyan-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/10 to-sky-400/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Rating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 glass-extreme px-4 py-2 rounded-full mb-6"
              role="img"
              aria-label="Valoración de 4.19 sobre 5 estrellas"
            >
              <div className="flex" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < 4 ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/50 fill-yellow-400/50"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">4.19 reseñas</span>
            </motion.div>

            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6 text-balance"
            >
              Tu bienestar es{" "}
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                nuestra prioridad
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0 text-pretty"
            >
              Centro de fisioterapia profesional en Terrassa. Tratamientos personalizados 
              con tecnología avanzada para recuperar tu calidad de vida.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-full px-8 shadow-xl shadow-blue-500/30 group"
                >
                  Reserva tu Cita
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="glass-extreme border-white/40 text-slate-700 hover:bg-white/30 rounded-full px-8"
                >
                  Ver Servicios
                </Button>
              </motion.div>
            </motion.div>

            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <div className="glass-extreme px-4 py-2 rounded-full flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-600">Terrassa, Barcelona</span>
              </div>
              <div className="glass-extreme px-4 py-2 rounded-full flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-slate-600">Lun-Vie: 9:00-21:00</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Glass Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="glass-extreme rounded-3xl p-6 sm:p-7 relative overflow-hidden border border-white/40 shadow-xl shadow-blue-500/10">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

              <div className="relative z-10">
                {/* Mismo alto que antes (h-44 / sm:h-48); object-position para centrar mejor el logo en el recorte */}
                <div className="relative h-44 sm:h-48 rounded-2xl overflow-hidden mb-5 border border-white/40">
                  <Image
                    src="/images/frb_portada.png"
                    alt="Interior de Fisioterapia Roc Blanc"
                    fill
                    className="object-cover object-[50%_42%]"
                    sizes="(max-width: 1024px) 100vw, 460px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/10 to-transparent" />
                  <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-blue-700">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    Centro recomendado en Terrassa
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900">Fisioterapia Roc Blanc</h3>
                <p className="text-slate-600 mt-2 mb-5">
                  Tecnología avanzada y trato humano para recuperar tu bienestar con seguridad.
                </p>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="rounded-xl bg-white/55 border border-white/50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-900 leading-none">15+</p>
                    <p className="text-[11px] text-slate-500 mt-1">Años</p>
                  </div>
                  <div className="rounded-xl bg-white/55 border border-white/50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-900 leading-none">500+</p>
                    <p className="text-[11px] text-slate-500 mt-1">Pacientes</p>
                  </div>
                  <div className="rounded-xl bg-white/55 border border-white/50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-900 leading-none">4.9</p>
                    <p className="text-[11px] text-slate-500 mt-1">Valoración</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl flex-1"
                    asChild
                  >
                    <Link href="#nosotros">
                      Conoce nuestro Staff
                      <Users className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <SmartCallButton className="rounded-xl border-white/50 bg-white/60 text-slate-700 hover:bg-white/80" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Indicador scroll: una sola animación ligera (Tailwind) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-400/50 flex justify-center pt-2 animate-bounce">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1" />
        </div>
      </motion.div>
    </section>
  )
}
