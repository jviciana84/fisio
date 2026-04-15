"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import { MapPin, Phone, Mail, Send, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const contactInfo = [
  {
    icon: MapPin,
    label: "Dirección",
    value: "Carrer de Pablo Iglesias, 24",
    subvalue: "08224 Terrassa, Barcelona",
    href: "https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Phone,
    label: "Teléfono",
    value: "938 08 50 56",
    subvalue: "Llámanos para una cita",
    href: "tel:938085056",
    color: "from-cyan-500 to-cyan-300",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@rocblanc.es",
    subvalue: "Respuesta en 24h",
    href: "mailto:info@rocblanc.es",
    color: "from-blue-500 to-cyan-400",
  },
]

export function Contact() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formState)
  }

  return (
    <section id="contacto" className="py-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block glass-extreme px-4 py-2 rounded-full text-sm font-medium text-blue-600 mb-4"
          >
            Contacto
          </motion.span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 text-balance">
            ¿Listo para{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              empezar
            </span>
            ?
          </h2>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            Ponte en contacto con nosotros y te ayudaremos a mejorar tu calidad de vida.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {contactInfo.map((info, index) => (
              <motion.a
                key={info.label}
                href={info.href}
                target={info.label === "Dirección" ? "_blank" : undefined}
                rel={info.label === "Dirección" ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="glass-extreme rounded-2xl p-6 flex items-start gap-4 group block relative overflow-hidden"
              >
                {/* Hover effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${info.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r from-white/0 via-white/30 to-white/0 pointer-events-none" />

                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0 relative z-10`}
                >
                  <info.icon className="w-6 h-6 text-white" />
                </div>

                <div className="relative z-10">
                  <div className="text-sm text-slate-500 mb-1">{info.label}</div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {info.value}
                  </div>
                  <div className="text-sm text-slate-500">{info.subvalue}</div>
                </div>
              </motion.a>
            ))}

            {/* Map Button */}
            <motion.a
              href="https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              className="glass-extreme rounded-2xl p-6 flex items-center justify-center gap-3 group cursor-pointer"
            >
              <Navigation className="w-5 h-5 text-blue-600 group-hover:animate-bounce" />
              <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                Cómo llegar
              </span>
            </motion.a>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="glass-extreme rounded-3xl p-8 relative overflow-hidden">
              {/* Shimmer */}
              <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-20" />

              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Envíanos un mensaje</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
                    <Input
                      id="contact-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="glass border-white/30 focus:border-blue-500/50 rounded-xl bg-white/50"
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="glass border-white/30 focus:border-blue-500/50 rounded-xl bg-white/50"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="600 000 000"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        className="glass border-white/30 focus:border-blue-500/50 rounded-xl bg-white/50"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-2">Mensaje</label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      placeholder="¿En qué podemos ayudarte?"
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full px-4 py-3 glass border border-white/30 focus:border-blue-500/50 rounded-xl bg-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl py-6 shadow-lg shadow-blue-500/25 group"
                    >
                      Enviar Mensaje
                      <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
