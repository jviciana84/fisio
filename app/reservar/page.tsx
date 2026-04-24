"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addMinutes } from "date-fns";
import { getISODay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { LegalConsentCheckboxText } from "@/components/legal-consent-checkbox-text";
import { SectionWatermark } from "@/components/section-watermark";

const LOGO_SRC = "/images/logo%20FRB3.svg";

/** Datos del centro (misma info que footer / contacto). */
const CENTRE = {
  name: "Fisioterapia Roc Blanc",
  addressLine: "Carrer de Pablo Iglesias, 24 · Terrassa",
  mapsUrl: "https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa",
  phoneDisplay: "938 08 50 56",
  phoneTel: "tel:938085056",
} as const;

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;

type BookingSuccessState = {
  bookingCode: string | null;
  startIso: string;
  slotMinutes: number;
  timezone: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  notes?: string;
  htmlLink?: string | null;
  clientRegistered: boolean;
};

type Slot = { start: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdInTimezone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function todayYmdInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Matriz de un mes: celdas `null` = hueco antes/después; `string` = yyyy-MM-dd (lunes = primera columna). */
function buildMonthCells(year: number, month1to12: number, tz: string): (string | null)[] {
  const dim = new Date(year, month1to12, 0).getDate();
  const first = fromZonedTime(`${year}-${pad2(month1to12)}-01T12:00:00`, tz);
  const leading = getISODay(first) - 1;
  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    cells.push(`${year}-${pad2(month1to12)}-${pad2(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthTitleEs(year: number, month1to12: number, tz: string): string {
  const noon = fromZonedTime(`${year}-${pad2(month1to12)}-15T12:00:00`, tz);
  const raw = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(noon);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatTimeOnly(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ReservarPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(45);
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDayYmd, setSelectedDayYmd] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [consentRgpd, setConsentRgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [copyCodeDone, setCopyCodeDone] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/booking/slots?days=70");
      const data = (await res.json()) as {
        ok?: boolean;
        slots?: Slot[];
        slotMinutes?: number;
        timezone?: string;
        available?: boolean;
      };
      if (data.ok && Array.isArray(data.slots)) {
        setSlots(data.slots);
        if (data.slotMinutes != null) setSlotMinutes(data.slotMinutes);
        if (data.timezone) setTimezone(data.timezone);
        setAvailable(data.available === true);
      }
    } catch {
      setMsg({ type: "err", text: "No se pudieron cargar las citas." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = ymdInTimezone(s.start, timezone);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [slots, timezone]);

  const dayKeys = useMemo(() => {
    const keys = [...slotsByDay.keys()];
    keys.sort();
    return keys;
  }, [slotsByDay]);

  useEffect(() => {
    if (dayKeys.length === 0) {
      setSelectedDayYmd(null);
      return;
    }
    if (!selectedDayYmd || !dayKeys.includes(selectedDayYmd)) {
      setSelectedDayYmd(dayKeys[0]!);
    }
  }, [dayKeys, selectedDayYmd]);

  const slotsForSelectedDay = selectedDayYmd ? slotsByDay.get(selectedDayYmd) ?? [] : [];

  const monthsToShow = useMemo(() => {
    const t = todayYmdInTz(timezone);
    const [y, m] = t.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return [];
    const next = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
    return [
      { year: y, month: m },
      { year: next.year, month: next.month },
    ];
  }, [timezone]);

  const todayYmd = useMemo(() => todayYmdInTz(timezone), [timezone]);

  useEffect(() => {
    if (!selected) return;
    if (!slots.some((s) => s.start === selected)) setSelected(null);
  }, [slots, selected]);

  const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const canSubmit = useMemo(() => {
    return (
      Boolean(selected) &&
      name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      phoneDigits.length >= 9 &&
      phoneDigits.length <= 15 &&
      address.trim().length >= 5 &&
      consentRgpd
    );
  }, [selected, name, email, phoneDigits, address, consentRgpd]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: selected,
          patientName: name.trim(),
          patientEmail: email.trim().toLowerCase(),
          patientPhone: phone.trim(),
          patientAddress: address.trim(),
          notes: notes.trim() || undefined,
          consentAccepted: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        htmlLink?: string;
        clientRegistered?: boolean;
        bookingCode?: string;
        startsAt?: string;
        timezone?: string;
        slotMinutes?: number;
      };
      if (!res.ok || !data.ok) {
        setMsg({ type: "err", text: data.message ?? "No se pudo reservar" });
        return;
      }

      const startIso = data.startsAt ?? selected;
      const tzOk = data.timezone ?? timezone;
      const slotM = data.slotMinutes ?? slotMinutes;

      setBookingSuccess({
        bookingCode: data.bookingCode ?? null,
        startIso,
        slotMinutes: slotM,
        timezone: tzOk,
        patientName: name.trim(),
        patientEmail: email.trim().toLowerCase(),
        patientPhone: phone.trim(),
        patientAddress: address.trim(),
        notes: notes.trim() || undefined,
        htmlLink: data.htmlLink,
        clientRegistered: data.clientRegistered !== false,
      });
      setMsg(null);
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
      setConsentRgpd(false);
      setSelected(null);
      await loadSlots();
    } catch {
      setMsg({ type: "err", text: "Error de red" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:px-3.5 sm:py-2.5";

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans">
      {/* Fondo alineado con la home */}
      <div className="pointer-events-none fixed inset-0 z-0 gradient-mesh" />
      <div className="pointer-events-none fixed -right-24 top-24 z-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none fixed -left-20 bottom-20 z-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <SectionWatermark align="left" fullViewport scaleFactor={1.05} />

      {/* Barra superior */}
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/55 backdrop-blur-xl print:hidden">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
            aria-label="Volver a inicio - Fisioterapia Roc Blanc"
          >
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl glass-extreme p-1">
              <img src={LOGO_SRC} alt="" width={48} height={48} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 transition group-hover:text-blue-600 sm:text-xs">
                Fisioterapia Roc Blanc
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">Reservar cita</p>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white hover:text-blue-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-10 text-center lg:mb-12 print:hidden"
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-800">
              <Sparkles className="size-3.5 text-cyan-600" aria-hidden />
              Cita online
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Elige día y hora{" "}
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                en un clic
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-slate-600 sm:text-lg">
              Selecciona un hueco libre. Duración habitual: {slotMinutes} min ·{" "}
              <span className="whitespace-nowrap text-slate-700">{timezone.replace("_", " ")}</span>
            </p>
          </motion.div>

          {loading ? (
            <div className="glass-extreme mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-3xl px-8 py-20 text-center">
              <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
              <p className="text-sm font-medium text-slate-600">Cargando disponibilidad…</p>
            </div>
          ) : !available ? (
            <div className="glass-extreme mx-auto max-w-lg rounded-3xl border border-amber-200/50 bg-amber-50/40 p-8 text-center shadow-xl shadow-amber-900/5">
              <CalendarDays className="mx-auto mb-4 size-12 text-amber-600/90" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-900">Reservas online no disponibles</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Llámanos al <a className="font-semibold text-blue-700 underline" href="tel:938085056">938 08 50 56</a>{" "}
                o escríbenos por WhatsApp y te encontramos hueco.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
              {/* Columna calendario */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.45 }}
                className={cn("flex h-full min-h-0 lg:col-span-7", bookingSuccess && "print:hidden")}
              >
                <div className="glass-extreme relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-white/50 p-4 shadow-2xl shadow-blue-900/10 sm:p-5">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/10 blur-2xl" />

                  <div className="relative mb-4 flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/25">
                      <CalendarDays className="size-[18px]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 sm:text-lg">Tu calendario</h2>
                      <p className="text-[11px] leading-tight text-slate-600 sm:text-xs">
                        Mes actual y siguiente · luego la hora
                      </p>
                    </div>
                  </div>

                  <>
                      {dayKeys.length === 0 ? (
                        <p className="relative mb-4 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-center text-xs text-amber-950">
                          No hay huecos libres en el rango consultado. Prueba otro día o llámanos al{" "}
                          <a className="font-semibold text-blue-700 underline" href="tel:938085056">
                            938 08 50 56
                          </a>
                          .
                        </p>
                      ) : null}

                      {/* Calendarios mes actual + siguiente */}
                      <div className="relative mb-5 grid gap-6 sm:gap-8 md:grid-cols-2">
                        {monthsToShow.map(({ year, month }) => {
                          const cells = buildMonthCells(year, month, timezone);
                          return (
                            <div key={`${year}-${month}`} className="min-w-0">
                              <p className="mb-3 text-center text-sm font-bold capitalize text-slate-800">
                                {monthTitleEs(year, month, timezone)}
                              </p>
                              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                                {WEEKDAY_LABELS.map((w) => (
                                  <div key={w} className="py-1">
                                    {w}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-1 grid grid-cols-7 gap-1">
                                {cells.map((ymd, idx) => {
                                  if (!ymd) {
                                    return (
                                      <div
                                        key={`e-${year}-${month}-${idx}`}
                                        className="aspect-square min-h-[2.25rem] sm:min-h-[2.5rem]"
                                      />
                                    );
                                  }
                                  const dayNum = Number(ymd.slice(8, 10));
                                  const isPast = ymd < todayYmd;
                                  const hasSlots = slotsByDay.has(ymd);
                                  const isToday = ymd === todayYmd;
                                  const isSelected = selectedDayYmd === ymd;
                                  const canPick = hasSlots && !isPast;

                                  return (
                                    <button
                                      key={ymd}
                                      type="button"
                                      disabled={!canPick}
                                      onClick={() => {
                                        if (!canPick) return;
                                        setSelectedDayYmd(ymd);
                                        setSelected(null);
                                      }}
                                      className={cn(
                                        "flex aspect-square min-h-[2.25rem] items-center justify-center rounded-xl text-sm font-semibold transition sm:min-h-[2.5rem] sm:text-base",
                                        isSelected && canPick
                                          ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/25"
                                          : canPick
                                            ? "border border-white/70 bg-white/70 text-slate-900 hover:border-blue-300 hover:bg-white"
                                            : "cursor-not-allowed border border-transparent text-slate-300",
                                        isToday &&
                                          !isSelected &&
                                          canPick &&
                                          "ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white/50",
                                        isToday && !canPick && "text-slate-400",
                                      )}
                                      title={
                                        !canPick
                                          ? isPast
                                            ? "Fecha pasada"
                                            : "Sin huecos libres"
                                          : `Elegir ${ymd}`
                                      }
                                    >
                                      {dayNum}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Horas */}
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          <Clock className="size-3 text-cyan-600" aria-hidden />
                          Hora
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          <AnimatePresence mode="popLayout">
                            {slotsForSelectedDay.map((s) => {
                              const active = selected === s.start;
                              return (
                                <motion.button
                                  key={s.start}
                                  layout
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96 }}
                                  type="button"
                                  onClick={() => setSelected(s.start)}
                                  className={cn(
                                    "rounded-xl border px-2 py-2 text-center text-xs font-semibold transition sm:text-sm",
                                    active
                                      ? "border-blue-500 bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20"
                                      : "border-white/70 bg-white/60 text-slate-800 hover:border-blue-300 hover:bg-white",
                                  )}
                                >
                                  {formatTimeOnly(s.start, timezone)}
                                </motion.button>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                  </>
                </div>
              </motion.div>

              {/* Formulario — misma altura que el calendario (grid stretch + flex column) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.45 }}
                className="flex h-full min-h-0 lg:col-span-5"
              >
                <div
                  className={cn(
                    "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border shadow-[0_24px_60px_-12px_rgba(30,58,138,0.18)] backdrop-blur-xl transition-colors duration-500",
                    bookingSuccess
                      ? "border-emerald-300/70 bg-emerald-50/35 shadow-emerald-900/10"
                      : "border-white/60 bg-white/75",
                  )}
                >
                  <div
                    className={cn(
                      "h-1",
                      bookingSuccess
                        ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400"
                        : "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400",
                    )}
                    aria-hidden
                  />
                  <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5 [perspective:1400px]">
                    <motion.div
                      className="relative min-h-[480px] w-full flex-1 sm:min-h-[520px]"
                      style={{ transformStyle: "preserve-3d" }}
                      initial={false}
                      animate={{ rotateY: bookingSuccess ? 180 : 0 }}
                      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Cara frontal: formulario */}
                      <div
                        className="absolute inset-0 flex flex-col overflow-y-auto rounded-2xl [backface-visibility:hidden]"
                        style={{ WebkitBackfaceVisibility: "hidden" }}
                      >
                        <div className="mb-4 flex shrink-0 items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20">
                            <User className="size-[18px]" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Tus datos</h2>
                            <p className="text-[11px] leading-snug text-slate-600 sm:text-xs">
                              Cita y alta como cliente del centro.
                            </p>
                          </div>
                        </div>

                    <form
                      onSubmit={onSubmit}
                      className="flex min-h-0 flex-1 flex-col justify-between gap-4"
                    >
                      <div className="min-h-0 space-y-3">
                        <AnimatePresence>
                          {msg?.type === "err" ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0 }}
                              className="flex gap-2 rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2 text-xs leading-snug text-red-950 sm:text-sm"
                            >
                              <p>{msg.text}</p>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {selected ? (
                          <div className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/95 to-cyan-50/60 px-3 py-2 shadow-inner">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700">Fecha elegida</p>
                            <p className="mt-0.5 text-sm font-semibold capitalize leading-tight text-slate-900">
                              {new Intl.DateTimeFormat("es-ES", {
                                timeZone: timezone,
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(selected))}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300/90 bg-slate-50/80 px-3 py-2.5 text-center text-[11px] text-slate-500">
                            Primero elige día y hora en el calendario.
                          </div>
                        )}

                        <label className="block">
                          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <User className="size-3 text-blue-600" aria-hidden />
                            Nombre y apellidos
                          </span>
                          <input
                            className={inputClass}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                            placeholder="María García López"
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block min-w-0">
                            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                              <Mail className="size-3 shrink-0 text-blue-600" aria-hidden />
                              Email
                            </span>
                            <input
                              className={inputClass}
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              autoComplete="email"
                              required
                              placeholder="correo@ejemplo.com"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                              <Phone className="size-3 shrink-0 text-cyan-600" aria-hidden />
                              Teléfono
                            </span>
                            <input
                              className={inputClass}
                              type="tel"
                              inputMode="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              autoComplete="tel"
                              required
                              placeholder="600 000 000"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <MapPin className="size-3 text-blue-600" aria-hidden />
                            Dirección
                          </span>
                          <input
                            className={inputClass}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            autoComplete="street-address"
                            required
                            placeholder="Calle, número, piso · ciudad"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <MessageSquare className="size-3 text-slate-500" aria-hidden />
                            Notas <span className="font-normal normal-case text-slate-400">(opcional)</span>
                          </span>
                          <textarea
                            className={cn(inputClass, "min-h-[72px] resize-y py-2 leading-snug")}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Motivo de la consulta, preferencias…"
                          />
                        </label>

                        <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 transition hover:border-blue-200 hover:bg-white">
                          <input
                            type="checkbox"
                            checked={consentRgpd}
                            onChange={(e) => setConsentRgpd(e.target.checked)}
                            className="size-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <LegalConsentCheckboxText />
                        </label>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={!canSubmit || submitting}
                        whileHover={{ scale: canSubmit && !submitting ? 1.01 : 1 }}
                        whileTap={{ scale: canSubmit && !submitting ? 0.99 : 1 }}
                        className="relative mt-1 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {submitting ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                            Reservando…
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-2">
                            <Sparkles className="size-4 opacity-90" aria-hidden />
                            Confirmar cita
                          </span>
                        )}
                      </motion.button>
                    </form>
                      </div>

                      {/* Cara trasera: confirmación */}
                      <div
                        className="absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-teal-50/80 to-emerald-100/90 p-4 shadow-inner [transform:rotateY(180deg)] [backface-visibility:hidden]"
                        style={{ WebkitBackfaceVisibility: "hidden" }}
                        id="booking-confirm-panel"
                      >
                        {bookingSuccess ? (
                          <>
                            <div className="mb-4 flex shrink-0 items-start gap-3">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/25">
                                <CheckCircle2 className="size-7" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <h2 className="text-lg font-bold text-emerald-950">Cita confirmada</h2>
                                <p className="mt-0.5 text-xs leading-snug text-emerald-900/90">
                                  Revisa tu correo: deberías recibir la invitación del calendario. Conserva el código de
                                  referencia si nos llamas.
                                </p>
                              </div>
                            </div>

                            <div className="min-h-0 flex-1 space-y-3 text-emerald-950">
                              {bookingSuccess.bookingCode ? (
                                <div className="rounded-2xl border border-emerald-200/90 bg-white/90 p-3.5 shadow-sm">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                    Código de cita
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xl font-bold tracking-wide sm:text-2xl">
                                      {bookingSuccess.bookingCode}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!bookingSuccess.bookingCode) return;
                                        try {
                                          await navigator.clipboard.writeText(bookingSuccess.bookingCode);
                                          setCopyCodeDone(true);
                                          window.setTimeout(() => setCopyCodeDone(false), 2000);
                                        } catch {
                                          /* ignore */
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-50"
                                    >
                                      <Copy className="size-3.5" aria-hidden />
                                      {copyCodeDone ? "Copiado" : "Copiar"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-xs text-amber-950">
                                  La cita quedó registrada en el calendario del centro; no se pudo generar el código en
                                  este momento. Si llamas, indica tu nombre y la hora de la cita.
                                </p>
                              )}

                              <div className="rounded-xl border border-emerald-200/80 bg-emerald-100/50 px-3 py-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                                  Fecha y hora
                                </p>
                                <p className="mt-1 text-sm font-semibold capitalize leading-snug text-emerald-950">
                                  {new Intl.DateTimeFormat("es-ES", {
                                    timeZone: bookingSuccess.timezone,
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }).format(new Date(bookingSuccess.startIso))}
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-emerald-900">
                                  {formatTimeOnly(bookingSuccess.startIso, bookingSuccess.timezone)} –{" "}
                                  {formatTimeOnly(
                                    addMinutes(new Date(bookingSuccess.startIso), bookingSuccess.slotMinutes).toISOString(),
                                    bookingSuccess.timezone,
                                  )}{" "}
                                  <span className="text-xs font-normal text-emerald-800/90">
                                    ({bookingSuccess.slotMinutes} min · {bookingSuccess.timezone.replace("_", " ")})
                                  </span>
                                </p>
                              </div>

                              <div className="rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Tus datos</p>
                                <ul className="mt-1.5 space-y-1 text-slate-800">
                                  <li>
                                    <span className="text-slate-500">Nombre:</span> {bookingSuccess.patientName}
                                  </li>
                                  <li>
                                    <span className="text-slate-500">Email:</span> {bookingSuccess.patientEmail}
                                  </li>
                                  <li>
                                    <span className="text-slate-500">Teléfono:</span> {bookingSuccess.patientPhone}
                                  </li>
                                  <li>
                                    <span className="text-slate-500">Dirección:</span> {bookingSuccess.patientAddress}
                                  </li>
                                  {bookingSuccess.notes ? (
                                    <li>
                                      <span className="text-slate-500">Notas:</span> {bookingSuccess.notes}
                                    </li>
                                  ) : null}
                                </ul>
                              </div>

                              <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                                  {CENTRE.name}
                                </p>
                                <a
                                  href={CENTRE.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 flex items-start gap-2 text-xs font-medium text-emerald-900 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                                >
                                  <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                                  {CENTRE.addressLine}
                                </a>
                                <a
                                  href={CENTRE.phoneTel}
                                  className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-900"
                                >
                                  <Phone className="size-4 text-emerald-700" aria-hidden />
                                  {CENTRE.phoneDisplay}
                                </a>
                              </div>

                              {!bookingSuccess.clientRegistered ? (
                                <p className="rounded-lg border border-amber-200 bg-amber-50/95 px-2.5 py-2 text-[11px] text-amber-950">
                                  No se pudo actualizar la ficha de cliente en el sistema. Si lo necesitas, llámanos.
                                </p>
                              ) : null}

                              <div className="flex flex-wrap gap-2 pt-1">
                                {bookingSuccess.htmlLink ? (
                                  <a
                                    href={bookingSuccess.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/90 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
                                  >
                                    <ExternalLink className="size-3.5" aria-hidden />
                                    Abrir en Google Calendar
                                  </a>
                                ) : null}
                                <a
                                  href={CENTRE.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/90 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
                                >
                                  <MapPin className="size-3.5" aria-hidden />
                                  Cómo llegar
                                </a>
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/90 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
                                >
                                  <Printer className="size-3.5" aria-hidden />
                                  Imprimir resumen
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setBookingSuccess(null);
                                setCopyCodeDone(false);
                              }}
                              className="mt-4 w-full shrink-0 rounded-xl border border-emerald-400/80 bg-white/90 py-3 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-white"
                            >
                              Nueva reserva
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-emerald-800/80">
                            Confirmando…
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
