"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"
import { BookingCtaLink } from "@/components/booking-cta-modal"

const LOGO_FRB3_SRC = "/images/logo%20FRB3.svg"

const INSTAGRAM_URL = "https://www.instagram.com/fisioterapia.rocblanc/"
const WHATSAPP_URL = "https://wa.me/34687549732"

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m4.8 3.2A4.8 4.8 0 1 1 9.6 12a4.8 4.8 0 0 1 3.2-4.8M18 6.96a1.08 1.08 0 1 1-1.08 1.08A1.08 1.08 0 0 1 18 6.96M12 8.8A3.2 3.2 0 1 0 15.2 12 3.2 3.2 0 0 0 12 8.8z" />
    </svg>
  )
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const socialLinks = [
  { icon: Phone, href: "tel:938085056", label: "Teléfono del centro" },
  { icon: Mail, href: "mailto:fisioterapia.rocblanc@gmail.com", label: "Email" },
  { icon: MapPin, href: "https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa", label: "Ubicación" },
  {
    icon: InstagramGlyph,
    href: INSTAGRAM_URL,
    label: "Instagram @fisioterapia.rocblanc",
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  },
  {
    icon: WhatsAppGlyph,
    href: WHATSAPP_URL,
    label: "WhatsApp 687 54 97 32",
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  },
]

const quickLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Servicios", href: "#servicios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Horario", href: "#horario" },
  { label: "Reservar cita online", href: "/reservar" },
  { label: "Contacto", href: "#contacto" },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-200" />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 sm:py-14 lg:grid-cols-4">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Link href="/" className="mb-4 flex items-center gap-3 group" aria-label="Inicio - Fisioterapia Roc Blanc">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex size-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full glass-extreme p-1.5"
              >
                <img
                  src={LOGO_FRB3_SRC}
                  alt="Logo Fisioterapia Roc Blanc - Centro de fisioterapia en Terrassa"
                  width={1000}
                  height={1286}
                  className="h-full w-full object-contain object-center [image-rendering:auto]"
                  decoding="async"
                />
              </motion.div>
              <div className="flex flex-col gap-0 leading-none">
                <span className="text-sm font-bold uppercase tracking-wide leading-none text-slate-900 transition-colors group-hover:text-blue-600 sm:text-base">
                  Fisioterapia
                </span>
                <span className="text-sm font-bold uppercase tracking-wide leading-none text-slate-500 sm:text-base">
                  Roc Blanc
                </span>
              </div>
            </Link>
            <p className="text-slate-600 mb-6 text-pretty">
              Centro de fisioterapia profesional en Terrassa. Tu bienestar es nuestra prioridad.
            </p>
            
            {/* Social Links */}
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target={"target" in social ? social.target : undefined}
                  rel={"rel" in social ? social.rel : undefined}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-extreme flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:text-blue-600"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="font-bold text-slate-900 mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <BookingCtaLink
                    href={link.href}
                    className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 h-0.5 bg-blue-600 group-hover:w-3 transition-all" />
                    {link.label}
                  </BookingCtaLink>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="font-bold text-slate-900 mb-4">Servicios</h4>
            <ul className="space-y-3">
              {["Fisioterapia Deportiva", "Traumatología", "Neurorehabilitación", "Electroterapia"].map((service) => (
                <li key={service}>
                  <span className="text-slate-600 flex items-center gap-2 group cursor-default">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="font-bold text-slate-900 mb-4">Contacto</h4>
            <ul className="space-y-4">
              <li>
                <a href="https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-slate-600 hover:text-blue-600 transition-colors">
                  <MapPin className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
                  <span>Carrer de Pablo Iglesias, 24<br />08224 Terrassa, Barcelona</span>
                </a>
              </li>
              <li>
                <a href="tel:938085056" className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span>938 08 50 56</span>
                </a>
              </li>
              <li>
                <a href="mailto:fisioterapia.rocblanc@gmail.com" className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>fisioterapia.rocblanc@gmail.com</span>
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-6 border-t border-slate-300/50"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Fisioterapia Roc Blanc. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-blue-600 transition-colors">Política de Privacidad</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">Aviso Legal</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
