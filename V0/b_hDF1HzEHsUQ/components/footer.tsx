"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"

const socialLinks = [
  // En esta versión de lucide-react no existen los exports Instagram/Facebook/Linkedin.
  // Se mantiene la estructura visual con iconos existentes para evitar errores de build.
  { icon: Phone, href: "#", label: "Instagram" },
  { icon: Mail, href: "#", label: "Facebook" },
  { icon: MapPin, href: "#", label: "LinkedIn" },
]

const quickLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Servicios", href: "#servicios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Horario", href: "#horario" },
  { label: "Contacto", href: "#contacto" },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-200" />
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl"
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer */}
        <div className="py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden glass-extreme">
                <Image
                  src="/logo-roc-blanc.jpg"
                  alt="Fisioterapia Roc Blanc"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900">Roc Blanc</span>
                <span className="text-xs text-slate-500 -mt-1">Fisioterapia</span>
              </div>
            </Link>
            <p className="text-slate-600 mb-6 text-pretty">
              Centro de fisioterapia profesional en Terrassa. Tu bienestar es nuestra prioridad.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-extreme w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
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
                  <Link
                    href={link.href}
                    className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 h-0.5 bg-blue-600 group-hover:w-3 transition-all" />
                    {link.label}
                  </Link>
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
                <a href="mailto:info@rocblanc.es" className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>info@rocblanc.es</span>
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
