"use client"

import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Star, MapPin, Clock, X, Users } from "lucide-react"
import { BookingCtaLink } from "@/components/booking-cta-modal"
import { Button } from "@/components/ui/button"
import { SmartCallButton } from "@/components/smart-call-button"
import type { GoogleBusinessRating } from "@/lib/google-business-rating"
import { heroStaffAvatarSrc, type HeroStaffMember } from "@/lib/hero-staff-data"
import { HeroCardCarousel } from "@/components/hero-card-carousel"
import { cn } from "@/lib/cn"
import { useHomeStaff } from "@/components/home-staff-context"

function StarMeter({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, rating))
  return (
    <div className="flex" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, r - i))
        return (
          <span key={i} className="relative inline-flex h-4 w-4 shrink-0">
            <Star className="absolute h-4 w-4 text-slate-300 fill-slate-200/90" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0" />
            </span>
          </span>
        )
      })}
    </div>
  )
}

type HeroProps = {
  googleRating: GoogleBusinessRating
  /** Miembros con perfil público (desde `staff_access`). Vacío = sin bloque de equipo en el card. */
  publicStaff: HeroStaffMember[]
}

export function Hero({ googleRating, publicStaff }: HeroProps) {
  const { staffOpen, staffDetailIndex, setStaffDetailIndex, closeStaff, openStaff } = useHomeStaff()

  const { rating, userRatingsTotal: totalReviews, source } = googleRating
  const label =
    source === "google_api" && totalReviews != null
      ? `Valoración de ${rating.toFixed(2)} sobre 5 estrellas, ${totalReviews} opiniones en Google`
      : totalReviews != null
        ? `Valoración de ${rating.toFixed(2)} sobre 5 estrellas, ${totalReviews} opiniones`
        : `Valoración de ${rating.toFixed(2)} sobre 5 estrellas`

  return (
    <section
      id="inicio"
      className="relative min-h-screen scroll-mt-24 sm:scroll-mt-28 flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-title"
      role="banner"
    >
      {/* Fondo: mesh estático (sin animación CSS infinita en toda la pantalla) */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Orbes decorativos estáticos: mismo look, sin repaints por frame */}
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-gradient-to-br from-blue-400/30 to-cyan-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/10 to-sky-400/10 blur-3xl pointer-events-none" />

      {/* Mismo ancho que el resto de secciones (`container`) */}
      <div className="container relative z-10 mx-auto w-full overflow-x-hidden px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid gap-12 items-center transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            staffOpen ? "lg:grid-cols-1" : "lg:grid-cols-2",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {!staffOpen ? (
              <motion.div
                key="hero-intro"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 text-center lg:text-left"
              >
            {/* Rating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 glass-extreme px-4 py-2 rounded-full mb-6"
              role="img"
              aria-label={label}
            >
              <StarMeter rating={rating} />
              <span className="text-sm font-medium text-slate-700">
                {rating.toFixed(2)} ·{" "}
                {totalReviews != null ? (
                  <>
                    {totalReviews} reseñas{source === "google_api" ? " en Google" : ""}
                  </>
                ) : (
                  "reseñas"
                )}
              </span>
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
              className="flex flex-row gap-2 justify-center lg:justify-start sm:gap-3"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  asChild
                  className="h-11 min-w-0 bg-gradient-to-r from-blue-600 to-cyan-500 px-3 text-xs text-white shadow-xl shadow-blue-500/30 group sm:px-6 sm:text-sm md:px-8 rounded-full hover:from-blue-700 hover:to-cyan-600"
                >
                  <BookingCtaLink href="/reservar" className="inline-flex items-center justify-center">
                    <span className="truncate">Reserva tu cita</span>
                    <ArrowRight className="ml-1.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 sm:ml-2 sm:h-5 sm:w-5" />
                  </BookingCtaLink>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-11 min-w-0 px-3 text-xs sm:px-6 sm:text-sm md:px-8 glass-extreme border-white/40 text-slate-700 hover:bg-white/30 rounded-full"
                >
                  <Link href="#servicios" className="truncate">
                    Ver Servicios
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-nowrap gap-2 justify-center lg:justify-start sm:gap-3"
            >
              <div className="glass-extreme min-w-0 px-3 py-2 rounded-full flex items-center gap-1.5 sm:px-4 sm:gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="truncate text-xs text-slate-600 sm:text-sm">Terrassa, Barcelona</span>
              </div>
              <div className="glass-extreme min-w-0 px-3 py-2 rounded-full flex items-center gap-1.5 sm:px-4 sm:gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span className="truncate text-xs text-slate-600 sm:text-sm">Horario: Lun-Vie 9:00-21:00</span>
              </div>
            </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Right Content - Glass Card: mismo alto siempre; el ancho crece hacia la izquierda al abrir staff */}
          <motion.div
            layout="position"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
            className={cn(
              "relative z-20 min-w-0 w-full lg:shrink-0",
              staffOpen && "lg:col-span-2 lg:justify-self-stretch",
            )}
          >
            <motion.div
              layout="position"
              transition={{ layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
              className={cn(
                "glass-extreme relative flex w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-white/40 shadow-xl shadow-blue-500/10 lg:origin-right",
                staffOpen
                  ? "h-[min(600px,83vh)] sm:h-[min(620px,85vh)] lg:w-full"
                  : "h-auto max-h-[min(720px,93vh)] lg:max-w-none",
              )}
              onPointerLeave={() => {
                if (
                  staffOpen &&
                  typeof window !== "undefined" &&
                  window.matchMedia("(hover: hover) and (pointer: fine)").matches
                ) {
                  closeStaff()
                }
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/25 to-transparent" />

              <AnimatePresence mode="wait" initial={false}>
                {!staffOpen ? (
                  <motion.div
                    key="card-default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex min-h-0 flex-col overflow-y-visible overscroll-y-auto p-4 pb-4 sm:p-5 lg:overflow-y-visible lg:overscroll-auto"
                    style={{ touchAction: "pan-y" }}
                  >
                    <HeroCardCarousel className="mb-4 h-[15rem] shrink-0 sm:mb-5 sm:h-72" />

                    <div className="flex min-h-0 flex-col gap-1.5">
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <h3 className="text-base font-bold uppercase leading-snug sm:text-lg">
                        <span className="font-extrabold tracking-[0.22em] text-slate-950">FISIOTERAPIA</span>
                        <span className="mx-2 inline-block font-semibold tracking-[0.16em] text-slate-500 sm:mx-3">
                          ROC BLANC
                        </span>
                      </h3>
                      <p className="shrink-0 text-xs leading-tight text-slate-600 sm:text-sm sm:leading-snug">
                        Tecnología avanzada y trato humano para recuperar tu bienestar con seguridad.
                      </p>
                    </div>

                    <div className="mt-2 grid shrink-0 grid-cols-3 gap-2 sm:mt-3">
                      <div className="rounded-xl border border-white/50 bg-white/55 px-2 py-1.5 text-center sm:px-3 sm:py-2">
                        <p className="text-base font-bold leading-none text-slate-900 sm:text-lg">15+</p>
                        <p className="mt-0.5 text-[9px] font-medium tracking-[0.12em] text-slate-500 sm:text-[10px]">
                          AÑOS
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/50 bg-white/55 px-2 py-1.5 text-center sm:px-3 sm:py-2">
                        <p className="text-base font-bold leading-none text-slate-900 sm:text-lg">500+</p>
                        <p className="mt-0.5 text-[9px] font-medium tracking-[0.12em] text-slate-500 sm:text-[10px]">
                          PACIENTES
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/50 bg-white/55 px-2 py-1.5 text-center sm:px-3 sm:py-2">
                        <p className="text-base font-bold leading-none text-slate-900 sm:text-lg">
                          {rating.toFixed(1)}
                        </p>
                        <p className="mt-0.5 text-[9px] font-medium tracking-[0.12em] text-slate-500 sm:text-[10px]">
                          VALORACIÓN
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-3 flex shrink-0 flex-row items-center gap-2 pt-0 sm:mt-4 ${publicStaff.length === 0 ? "justify-end" : ""}`}
                    >
                      {publicStaff.length > 0 ? (
                        <Button
                          type="button"
                          onClick={openStaff}
                          className="h-10 min-w-0 flex-1 gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-cyan-600 sm:h-8 sm:gap-1 sm:px-2.5 sm:text-xs"
                        >
                          <span className="min-w-0 truncate">Conoce nuestro Staff</span>
                          <Users className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      <SmartCallButton
                        className={`h-10 min-h-10 shrink-0 rounded-full border-white/50 bg-white/60 px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-white/80 sm:h-8 sm:min-h-8 sm:px-2.5 sm:text-xs ${publicStaff.length === 0 ? "flex-1 sm:flex-none" : ""}`}
                      />
                    </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="card-staff"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex h-full min-h-0 flex-col p-4 pt-11 sm:p-5 sm:pt-12"
                  >
                    <button
                      type="button"
                      onClick={closeStaff}
                      className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-white/50 bg-white/70 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 sm:h-9 sm:w-9"
                      aria-label="Cerrar equipo"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    <h3 className="mb-2 text-center text-base font-bold text-slate-900 sm:mb-3 sm:text-left sm:text-xl">
                      Conoce nuestro{" "}
                      <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        staff
                      </span>
                    </h3>

                    {/* Ocupa el alto del card (fijo); solo cambia el ancho del contenedor padre */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      {staffDetailIndex === null ? (
                        <motion.div
                          key="staff-grid"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.25 }}
                          className="flex h-full min-h-0 flex-col gap-2"
                        >
                          <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-4 gap-1.5 sm:grid-cols-7 sm:grid-rows-2 sm:gap-2">
                            {publicStaff.map((person, index) => (
                              <motion.button
                                key={person.id}
                                type="button"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.02 * index, type: "spring", stiffness: 400, damping: 28 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setStaffDetailIndex(index)}
                                className="flex min-h-0 flex-col gap-0.5 overflow-hidden rounded-xl border border-white/45 bg-white/35 p-1 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-blue-300/50 hover:bg-white/45 sm:gap-1 sm:p-1.5"
                              >
                                <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-white/40 bg-white/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={heroStaffAvatarSrc(person)}
                                    alt=""
                                    className="h-full w-full object-cover object-center"
                                  />
                                </div>
                                <p className="line-clamp-2 text-center text-[8px] font-semibold leading-tight text-slate-900 sm:text-[10px]">
                                  {person.name}
                                </p>
                                <p className="line-clamp-1 text-center text-[7px] leading-tight text-slate-500 sm:text-[9px]">
                                  {person.specialty}
                                </p>
                              </motion.button>
                            ))}
                          </div>
                          <p className="shrink-0 text-center text-[10px] leading-tight text-slate-500">
                            Pulsa un perfil · cursor fuera del panel para cerrar
                          </p>
                        </motion.div>
                      ) : staffDetailIndex !== null &&
                        publicStaff[staffDetailIndex] ? (
                        <motion.div
                          key={`staff-detail-${publicStaff[staffDetailIndex].id}`}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="flex h-full min-h-0 flex-col gap-3 xl:flex-row xl:gap-0"
                        >
                          {/* Ficha ~30% */}
                          <div className="flex min-h-0 w-full min-w-0 flex-col gap-2 xl:w-[30%] xl:shrink-0 xl:pr-3">
                            <div className="relative min-h-[100px] w-full flex-1 overflow-hidden rounded-2xl border border-white/50 bg-white/25 shadow-inner">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={heroStaffAvatarSrc(publicStaff[staffDetailIndex])}
                                alt=""
                                className="h-full w-full min-h-[120px] object-cover object-center"
                              />
                            </div>
                            <p className="text-lg font-bold leading-tight tracking-tight text-slate-900 sm:text-xl">
                              {publicStaff[staffDetailIndex].name}
                            </p>
                            <p className="text-[11px] font-medium leading-snug text-cyan-700 sm:text-xs">
                              {publicStaff[staffDetailIndex].specialty}
                            </p>
                            <p className="min-h-0 flex-1 overflow-y-auto text-pretty text-xs leading-relaxed text-slate-600 sm:text-sm">
                              {publicStaff[staffDetailIndex].bio}
                            </p>
                            <Button
                              className="h-9 w-full shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-2 text-xs text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-cyan-600 sm:h-10 sm:text-sm"
                              asChild
                            >
                              <BookingCtaLink href="/reservar" onClick={closeStaff}>
                                Reservar cita con especialista
                                <ArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                              </BookingCtaLink>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-full shrink-0 rounded-xl border-white/60 bg-white/45 px-2 text-[11px] text-slate-700 hover:bg-white/70 sm:h-9 sm:text-xs"
                              onClick={() => setStaffDetailIndex(null)}
                            >
                              Volver a conocer nuestro personal
                            </Button>
                          </div>

                          <div
                            className="hidden h-px shrink-0 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent xl:block xl:h-auto xl:w-px xl:bg-gradient-to-b"
                            aria-hidden
                          />

                          {/* En smartphone/tablet mostramos solo la bio del perfil seleccionado. */}
                          <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:flex xl:pl-3">
                            <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-4 gap-1 sm:grid-cols-4 sm:grid-rows-4 sm:gap-1.5">
                              {publicStaff.map((person, index) => {
                                if (index === staffDetailIndex) return null
                                return (
                                  <motion.button
                                    key={person.id}
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStaffDetailIndex(index)}
                                    title={person.name}
                                    className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-white/45 bg-gradient-to-b from-white/55 to-white/35 p-1 text-center shadow-sm transition-colors hover:border-blue-400/45 hover:from-white/70 hover:to-white/50"
                                  >
                                    {/* ~2/3 altura: rostro más visible */}
                                    <div className="relative min-h-0 w-full flex-[2.2] overflow-hidden rounded-md border border-white/35 bg-white/40">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={heroStaffAvatarSrc(person)}
                                        alt=""
                                        className="h-full w-full object-cover object-[50%_22%]"
                                      />
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col justify-center gap-0 px-0.5 pt-0.5">
                                      <p className="line-clamp-2 text-[10px] font-bold leading-[1.15] text-slate-900 sm:text-[11px]">
                                        {person.name}
                                      </p>
                                      <p className="line-clamp-2 text-[8px] font-medium leading-tight text-cyan-800 sm:text-[9px]">
                                        {person.specialty}
                                      </p>
                                    </div>
                                  </motion.button>
                                )
                              })}
                            </div>
                          </div>

                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Indicador scroll: una sola animación ligera (Tailwind) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block"
        aria-hidden="true"
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-400/50 flex justify-center pt-2 animate-bounce">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1" />
        </div>
      </motion.div>
    </section>
  )
}
