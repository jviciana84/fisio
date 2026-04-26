"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import { cn } from "@/lib/cn";

const WHATSAPP_URL = "https://wa.me/34687549732";
const PHONE_TEL = "tel:938085056";
const PHONE_DISPLAY = "938 08 50 56";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function bookingCtaDisabled(): boolean {
  return process.env.NEXT_PUBLIC_BOOKING_CTA_DISABLED === "true";
}

type Ctx = {
  openModal: () => void;
  disabled: boolean;
};

const BookingCtaContext = createContext<Ctx | null>(null);

export function useBookingCta(): Ctx {
  const ctx = useContext(BookingCtaContext);
  if (!ctx) {
    throw new Error("useBookingCta debe usarse dentro de BookingCtaProvider");
  }
  return ctx;
}

export function BookingCtaProvider({ children }: { children: ReactNode }) {
  const disabled = useMemo(() => bookingCtaDisabled(), []);
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ openModal, disabled }), [openModal, disabled]);

  return (
    <BookingCtaContext.Provider value={value}>
      {children}
      {disabled ? (
        <AnimatePresence>
          {open ? (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-cta-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/45 backdrop-blur-md"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/12"
              >
                <div className="p-6 sm:p-8">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute right-3 top-4 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Cerrar ventana"
                  >
                    <X className="size-5" />
                  </button>
                  <div className="pr-10">
                    <p className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                      En construcción
                    </p>
                    <h2
                      id="booking-cta-modal-title"
                      className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                    >
                      Reserva online en preparación
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                      Pedimos disculpas: la reserva por web aún está en construcción. Para pedir o revisar cita puedes
                      llamarnos o escribirnos por WhatsApp; te atenderemos encantados.
                    </p>
                  </div>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
                    <a
                      href={PHONE_TEL}
                      className={cn(
                        "inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-cyan-600 sm:min-h-14 sm:text-base",
                      )}
                    >
                      <Phone className="size-5 shrink-0 opacity-95" aria-hidden />
                      <span className="text-center leading-tight">
                        Llamar
                        <span className="mt-0.5 block text-xs font-semibold opacity-95 sm:text-[13px]">
                          {PHONE_DISPLAY}
                        </span>
                      </span>
                    </a>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-cyan-300/70 hover:bg-white sm:min-h-14 sm:text-base",
                      )}
                    >
                      <WhatsAppGlyph className="size-5 shrink-0 text-emerald-600" />
                      <span className="text-center leading-tight">
                        WhatsApp
                        <span className="mt-0.5 block text-xs font-medium text-slate-600 sm:text-[13px]">
                          Escríbenos
                        </span>
                      </span>
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-6 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </BookingCtaContext.Provider>
  );
}

type BookingCtaLinkProps = ComponentPropsWithoutRef<typeof Link>;

export const BookingCtaLink = forwardRef<HTMLAnchorElement | HTMLButtonElement, BookingCtaLinkProps>(
  function BookingCtaLink({ href, className, children, onClick, ...rest }, ref) {
    const { disabled, openModal } = useBookingCta();

    if (disabled && href === "/reservar") {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={className}
          onClick={(e) => {
            onClick?.(e as unknown as React.MouseEvent<HTMLAnchorElement>);
            openModal();
          }}
        >
          {children}
        </button>
      );
    }

    /** Anclas en la misma página: scroll suave (Next.js Link no siempre desplaza al fragmento). */
    if (typeof href === "string" && href.startsWith("#")) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={className}
          onClick={(e) => {
            e.preventDefault();
            onClick?.(e);
            const id = href.slice(1);
            const go = () => {
              const el = document.getElementById(id);
              if (el) {
                const reduce =
                  typeof window !== "undefined" &&
                  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
                el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                try {
                  window.history.replaceState(null, "", href);
                } catch {
                  // ignore
                }
              } else {
                // Si estamos fuera de la home, redirigimos al ancla de la landing pública.
                window.location.assign(`/${href}`);
              }
            };
            // Cerrar el menú móvil en el mismo tick dispara re-layout; en Safari/Chrome móvil
            // el scroll al fragmento a menudo falla si se hace síncrono tras preventDefault.
            if (typeof window === "undefined") {
              return;
            }
            const isNarrow = window.matchMedia("(max-width: 1023px)").matches;
            // Un frame extra en vista estrecha mejora la fiabilidad del scroll.
            window.setTimeout(go, isNarrow ? 32 : 0);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    }

    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={className} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  },
);
