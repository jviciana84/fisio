"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import { MapPin, Phone, Mail, Send, Navigation, ThumbsUp, ThumbsDown, CircleCheckBig, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionWatermark } from "@/components/section-watermark"

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
    value: "fisioterapia.rocblanc@gmail.com",
    subvalue: "Respuesta en 24h",
    href: "mailto:fisioterapia.rocblanc@gmail.com",
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
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [submitErrorMessage, setSubmitErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateField = (field: keyof typeof formState, value: string) => {
    if (!value.trim()) return "Este campo es obligatorio."
    return ""
  }

  const validateForm = () => {
    const nextErrors = {
      name: validateField("name", formState.name),
      email: validateField("email", formState.email),
      phone: validateField("phone", formState.phone),
      message: validateField("message", formState.message),
    }

    setErrors(nextErrors)
    return !Object.values(nextErrors).some(Boolean)
  }

  const handleFieldChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: value.trim() ? "" : prev[field] }))
  }

  const handleFieldBlur = (field: keyof typeof formState) => {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, formState[field]) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitErrorMessage("")

    if (!validateForm()) {
      setSubmitErrorMessage("Revisa el formulario: todos los campos son obligatorios.")
      setSubmitStatus("error")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })

      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (!res.ok || !data.ok) {
        setSubmitErrorMessage(data.message ?? "No se pudo enviar el mensaje. Inténtalo de nuevo.")
        setSubmitStatus("error")
        return
      }

      setSubmitStatus("success")
      setFormState({ name: "", email: "", phone: "", message: "" })
      setErrors({ name: "", email: "", phone: "", message: "" })
    } catch {
      setSubmitErrorMessage("Error de conexión. Inténtalo de nuevo en unos segundos.")
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCard = () => {
    setSubmitStatus("idle")
    setSubmitErrorMessage("")
  }

  return (
    <section id="contacto" className="py-14 relative overflow-hidden sm:py-16">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" aria-hidden />

      <SectionWatermark align="left" />

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
                <div className={`absolute inset-0 bg-gradient-to-r ${info.color} opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-10`} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-20" />

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
            className="h-full self-stretch"
          >
            <div className="h-full [perspective:1400px]">
              <motion.div
                animate={{ rotateY: submitStatus === "idle" ? 0 : 180 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative min-h-[560px] sm:min-h-[580px] lg:h-full lg:min-h-0"
              >
                <form
                  onSubmit={handleSubmit}
                  className="glass-extreme absolute inset-0 rounded-3xl px-8 pt-5 pb-12 overflow-hidden [backface-visibility:hidden]"
                >
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
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          onBlur={() => handleFieldBlur("name")}
                          className={`glass rounded-xl bg-white/50 focus:border-blue-500/50 ${
                            errors.name ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                          }`}
                          required
                          autoComplete="name"
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? "contact-name-error" : undefined}
                        />
                        {errors.name ? (
                          <p id="contact-name-error" className="mt-1.5 rounded-lg bg-red-50/80 px-3 py-1.5 text-xs text-red-600">
                            {errors.name}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="tu@email.com"
                            value={formState.email}
                            onChange={(e) => handleFieldChange("email", e.target.value)}
                            onBlur={() => handleFieldBlur("email")}
                            className={`glass rounded-xl bg-white/50 focus:border-blue-500/50 ${
                              errors.email ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                            }`}
                            required
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "contact-email-error" : undefined}
                          />
                          {errors.email ? (
                            <p id="contact-email-error" className="mt-1.5 rounded-lg bg-red-50/80 px-3 py-1.5 text-xs text-red-600">
                              {errors.email}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            placeholder="600 000 000"
                            value={formState.phone}
                            onChange={(e) => handleFieldChange("phone", e.target.value)}
                            onBlur={() => handleFieldBlur("phone")}
                            className={`glass rounded-xl bg-white/50 focus:border-blue-500/50 ${
                              errors.phone ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                            }`}
                            required
                            autoComplete="tel"
                            aria-invalid={!!errors.phone}
                            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                          />
                          {errors.phone ? (
                            <p id="contact-phone-error" className="mt-1.5 rounded-lg bg-red-50/80 px-3 py-1.5 text-xs text-red-600">
                              {errors.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-2">Mensaje</label>
                        <textarea
                          id="contact-message"
                          rows={4}
                          placeholder="¿En qué podemos ayudarte?"
                          value={formState.message}
                          onChange={(e) => handleFieldChange("message", e.target.value)}
                          onBlur={() => handleFieldBlur("message")}
                          className={`w-full resize-none rounded-xl bg-white/50 px-4 py-3 glass transition-all focus:outline-none focus:ring-2 ${
                            errors.message
                              ? "border border-red-300/80 focus:border-red-400 focus:ring-red-200/60"
                              : "border border-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                          }`}
                          required
                          aria-invalid={!!errors.message}
                          aria-describedby={errors.message ? "contact-message-error" : undefined}
                        />
                        {errors.message ? (
                          <p id="contact-message-error" className="mt-1.5 rounded-lg bg-red-50/80 px-3 py-1.5 text-xs text-red-600">
                            {errors.message}
                          </p>
                        ) : null}
                      </div>

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl py-6 shadow-lg shadow-blue-500/25 group"
                        >
                          {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
                          <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </form>

                <div
                  className={`absolute inset-0 rounded-3xl p-8 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    submitStatus === "success"
                      ? "bg-gradient-to-br from-emerald-600 to-green-500"
                      : "bg-gradient-to-br from-red-500 to-rose-500"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-6 rounded-full bg-white/20 p-5 shadow-xl ring-4 ring-white/25">
                      {submitStatus === "success" ? (
                        <CircleCheckBig className="h-14 w-14" />
                      ) : (
                        <CircleX className="h-14 w-14" />
                      )}
                    </div>

                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {submitStatus === "success" ? "¡Mensaje preparado!" : "Faltan campos obligatorios"}
                    </h3>
                    <p className="mt-4 max-w-md text-white/95">
                      {submitStatus === "success"
                        ? "Gracias por contactar. Tu mensaje se ha enviado correctamente."
                        : submitErrorMessage || "No se pudo enviar el mensaje. Revisa el formulario e inténtalo de nuevo."}
                    </p>

                    <div className="mt-6 flex items-center gap-3 text-white/90">
                      {submitStatus === "success" ? (
                        <>
                          <ThumbsUp className="h-7 w-7" />
                          <span className="font-semibold">Todo listo</span>
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="h-7 w-7" />
                          <span className="font-semibold">Necesita corrección</span>
                        </>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={resetCard}
                      className="mt-8 rounded-xl border border-white/30 bg-white/20 px-6 py-5 text-white hover:bg-white/30"
                    >
                      {submitStatus === "success" ? "Enviar otro mensaje" : "Volver y completar campos"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
