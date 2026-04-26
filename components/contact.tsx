"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import { MapPin, Phone, Mail, Send, Navigation, ThumbsUp, ThumbsDown, CircleCheckBig, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionWatermark } from "@/components/section-watermark"
import { LegalConsentCheckboxText } from "@/components/legal-consent-checkbox-text"

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
  const [consentLegal, setConsentLegal] = useState(false)

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

    if (!consentLegal) {
      setSubmitErrorMessage("Debes aceptar la Política de Privacidad.")
      setSubmitStatus("error")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formState, consentAccepted: true }),
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
      setConsentLegal(false)
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
    <section id="contacto" className="scroll-mt-24 sm:scroll-mt-28 py-14 relative overflow-hidden sm:py-16">
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

        <div className="mx-auto grid max-w-6xl items-stretch gap-8 lg:grid-cols-2">
          {/* Contact Info: en lg, misma altura que el form (min-h) y tarjetas reparten el espacio */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex h-full min-h-0 flex-col gap-4 lg:min-h-[30rem] lg:gap-6"
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
                className="glass-extreme group relative flex w-full min-h-0 items-start gap-4 overflow-hidden rounded-2xl p-6 lg:min-h-0 lg:flex-1 lg:basis-0 lg:items-center lg:py-7 lg:pl-7 lg:pr-8"
              >
                {/* Hover effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${info.color} opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-10`}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-20" />

                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.color}`}
                >
                  <info.icon className="h-6 w-6 text-white" />
                </div>

                <div className="relative z-10 min-w-0 flex-1">
                  <div className="mb-1 text-sm text-slate-500">{info.label}</div>
                  <div className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
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
              className="glass-extreme group flex w-full min-h-0 cursor-pointer items-center justify-center gap-3 rounded-2xl p-6 lg:min-h-0 lg:flex-1 lg:basis-0 lg:px-7 lg:py-7"
            >
              <Navigation className="h-5 w-5 text-blue-600 group-hover:animate-bounce" />
              <span className="font-medium text-slate-700 transition-colors group-hover:text-blue-600">
                Cómo llegar
              </span>
            </motion.a>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-full self-stretch w-full"
          >
            <div className="h-full min-h-0 [perspective:1400px] [touch-action:manipulation]">
              <motion.div
                animate={{ rotateY: submitStatus === "idle" ? 0 : 180 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative h-full w-full min-h-[30rem]"
              >
                <form
                  onSubmit={handleSubmit}
                  className="glass-extreme absolute inset-0 flex min-h-0 flex-col overflow-hidden rounded-3xl [backface-visibility:hidden] [touch-action:manipulation]"
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-20" />

                  <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible px-5 py-4 sm:px-7 sm:py-4">
                    <h3 className="mb-2.5 text-lg font-bold leading-tight text-slate-900 sm:text-2xl">Envíanos un mensaje</h3>

                    <div className="space-y-2.5 sm:space-y-3">
                      <div>
                        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                        <Input
                          id="contact-name"
                          type="text"
                          placeholder="Tu nombre"
                          value={formState.name}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          onBlur={() => handleFieldBlur("name")}
                          className={`h-9 glass rounded-lg bg-white/50 text-sm focus:border-blue-500/50 sm:rounded-xl ${
                            errors.name ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                          }`}
                          required
                          autoComplete="name"
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? "contact-name-error" : undefined}
                        />
                        {errors.name ? (
                          <p id="contact-name-error" className="mt-1 rounded-lg bg-red-50/80 px-2.5 py-1 text-xs text-red-600">
                            {errors.name}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                        <div>
                          <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="tu@email.com"
                            value={formState.email}
                            onChange={(e) => handleFieldChange("email", e.target.value)}
                            onBlur={() => handleFieldBlur("email")}
                            className={`h-9 glass rounded-lg bg-white/50 text-sm focus:border-blue-500/50 sm:rounded-xl ${
                              errors.email ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                            }`}
                            required
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "contact-email-error" : undefined}
                          />
                          {errors.email ? (
                            <p id="contact-email-error" className="mt-1 rounded-lg bg-red-50/80 px-2.5 py-1 text-xs text-red-600">
                              {errors.email}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            placeholder="600 000 000"
                            value={formState.phone}
                            onChange={(e) => handleFieldChange("phone", e.target.value)}
                            onBlur={() => handleFieldBlur("phone")}
                            className={`h-9 glass rounded-lg bg-white/50 text-sm focus:border-blue-500/50 sm:rounded-xl ${
                              errors.phone ? "border-red-300/80 focus:border-red-400" : "border-white/30"
                            }`}
                            required
                            autoComplete="tel"
                            aria-invalid={!!errors.phone}
                            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                          />
                          {errors.phone ? (
                            <p id="contact-phone-error" className="mt-1 rounded-lg bg-red-50/80 px-2.5 py-1 text-xs text-red-600">
                              {errors.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">Mensaje</label>
                        <textarea
                          id="contact-message"
                          rows={2}
                          placeholder="¿En qué podemos ayudarte?"
                          value={formState.message}
                          onChange={(e) => handleFieldChange("message", e.target.value)}
                          onBlur={() => handleFieldBlur("message")}
                          className={`min-h-[4.5rem] w-full resize-none rounded-lg bg-white/50 px-3 py-2 text-sm leading-snug glass transition-all focus:outline-none focus:ring-2 sm:min-h-[4.75rem] sm:rounded-xl ${
                            errors.message
                              ? "border border-red-300/80 focus:border-red-400 focus:ring-red-200/60"
                              : "border border-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                          }`}
                          required
                          aria-invalid={!!errors.message}
                          aria-describedby={errors.message ? "contact-message-error" : undefined}
                        />
                        {errors.message ? (
                          <p id="contact-message-error" className="mt-1 rounded-lg bg-red-50/80 px-2.5 py-1 text-xs text-red-600">
                            {errors.message}
                          </p>
                        ) : null}
                      </div>

                      <label className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 text-left text-sm text-slate-700 transition hover:border-blue-200 hover:bg-white sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-base">
                        <input
                          type="checkbox"
                          checked={consentLegal}
                          onChange={(e) => setConsentLegal(e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          required
                        />
                        <LegalConsentCheckboxText />
                      </label>

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-sm text-white shadow-lg shadow-blue-500/25 group hover:from-blue-700 hover:to-cyan-600 sm:h-12 sm:rounded-xl sm:text-base"
                        >
                          {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
                          <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </form>

                <div
                  className={`absolute inset-0 rounded-3xl px-5 py-3 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-7 sm:py-3.5 ${
                    submitStatus === "success"
                      ? "bg-gradient-to-br from-emerald-600 to-green-500"
                      : "bg-gradient-to-br from-red-500 to-rose-500"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
                    <div className="mb-3 rounded-full bg-white/20 p-3.5 shadow-xl ring-4 ring-white/25 sm:mb-4 sm:p-5">
                      {submitStatus === "success" ? (
                        <CircleCheckBig className="h-12 w-12 sm:h-14 sm:w-14" />
                      ) : (
                        <CircleX className="h-12 w-12 sm:h-14 sm:w-14" />
                      )}
                    </div>

                    <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {submitStatus === "success" ? "¡Mensaje preparado!" : "Faltan campos obligatorios"}
                    </h3>
                    <p className="mt-2.5 max-w-md text-sm text-white/95 sm:mt-3.5 sm:text-base">
                      {submitStatus === "success"
                        ? "Gracias por contactar. Tu mensaje se ha enviado correctamente."
                        : submitErrorMessage || "No se pudo enviar el mensaje. Revisa el formulario e inténtalo de nuevo."}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm text-white/90 sm:mt-4 sm:gap-3 sm:text-base">
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
                      className="mt-4 rounded-lg border border-white/30 bg-white/20 px-4 py-3 text-sm text-white hover:bg-white/30 sm:mt-5 sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base"
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

