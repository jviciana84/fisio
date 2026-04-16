"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

const WHATSAPP_URL = "https://wa.me/34938085056"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#servicios", label: "Servicios" },
  { href: "#bonos", label: "Bonos" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#horario", label: "Horario" },
  { href: "#contacto", label: "Contacto" },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-white/50 py-3"
          : "bg-white/30 backdrop-blur-md py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Inicio - Fisioterapia Roc Blanc">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-12 shrink-0 items-center justify-center rounded-xl glass-extreme px-1.5 py-1 overflow-visible"
            style={{ aspectRatio: "1000 / 1286", width: "auto" }}
          >
            <img
              src="/images/logo-icon.svg"
              alt="Logo Fisioterapia Roc Blanc - Centro de fisioterapia en Terrassa"
              width={1000}
              height={1286}
              className="h-full w-full object-contain object-center [image-rendering:auto]"
              decoding="async"
              fetchPriority="high"
            />
          </motion.div>
          <div className="flex flex-col gap-0 leading-none">
            <span className="text-sm sm:text-base font-bold tracking-wide uppercase leading-none text-slate-900 group-hover:text-blue-600 transition-colors">
              Fisioterapia
            </span>
            <span className="text-sm sm:text-base font-bold tracking-wide uppercase leading-none text-slate-500">
              Roc Blanc
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-400 group-hover:w-3/4 transition-all duration-300" />
              </Link>
            </motion.div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-extreme p-2.5 rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors"
            aria-label="Escribir por WhatsApp"
          >
            <WhatsAppIcon className="w-[18px] h-[18px]" />
          </motion.a>
          <motion.a
            href="tel:938085056"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-extreme px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            <Phone className="w-4 h-4" />
            938 08 50 56
          </motion.a>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-full px-6 shadow-lg shadow-blue-500/25 animate-pulse-glow">
              Pedir Cita
            </Button>
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden glass-extreme p-2 rounded-xl"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-slate-700" />
          ) : (
            <Menu className="w-6 h-6 text-slate-700" />
          )}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-extreme mt-2 mx-4 rounded-2xl overflow-hidden"
          >
            <nav className="flex flex-col p-4" aria-label="Navegación móvil">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-3 px-4 text-slate-700 hover:text-blue-600 hover:bg-white/50 rounded-xl transition-all"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 pt-4 border-t border-white/20 flex flex-col gap-3"
              >
                <div className="flex items-center justify-center gap-2">
                  <motion.a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.98 }}
                    className="glass-extreme p-3 rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors"
                    aria-label="Escribir por WhatsApp"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="tel:938085056"
                    whileTap={{ scale: 0.98 }}
                    className="glass-extreme flex-1 px-4 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    938 08 50 56
                  </motion.a>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl">
                  Pedir Cita
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
