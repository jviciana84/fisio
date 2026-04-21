"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_INPUT_CLASS, DASHBOARD_INPUT_CLASS_FORM } from "@/components/dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatEuroFromCents } from "@/lib/format-es";

export type ClientDetailModalProps = {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
};

type TicketItem = {
  id: string;
  concept: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type TicketRow = {
  id: string;
  ticketNumber: string;
  subtotalCents: number;
  manualAmountCents: number;
  totalCents: number;
  paymentMethod: string;
  createdAt: string;
  createdByStaffId: string | null;
  items: TicketItem[];
};

type ClientDetail = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  isActive: boolean;
  estadoPago: string | null;
  leadContactedAt: string | null;
  origenCliente: string | null;
  rgpdConsentAt: string | null;
  rgpdConsentVersion: string | null;
  bonoRemainingSessions: number | null;
  bonoExpiresAt: string | null;
};

function paymentLabel(m: string) {
  switch (m) {
    case "cash":
      return "Efectivo";
    case "bizum":
      return "Bizum";
    case "card":
      return "Tarjeta";
    default:
      return m;
  }
}

/** YYYY-MM-DD → fin de ese día local vs ahora */
function bonoCaducadoPorFecha(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const end = new Date(`${expiresAt}T23:59:59`);
  return end.getTime() < Date.now();
}

/** Tarjetas del modal: borde y fondo con contraste frente al blanco del modal. */
const MODAL_CARD_CLASS =
  "rounded-xl border border-slate-300 bg-slate-100 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:p-3";

const MODAL_CARD_HEADING =
  "border-b border-slate-300/90 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-800";

export function ClientDetailModal({ clientId, onClose, onSaved }: ClientDetailModalProps) {
  /** Ficha compacta: mismo estilo base que tablas intranet. */
  const inputClass = DASHBOARD_INPUT_CLASS;
  const inputClassComfort = DASHBOARD_INPUT_CLASS_FORM;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [origenCliente, setOrigenCliente] = useState<string>("");
  const [clearLeadContact, setClearLeadContact] = useState(false);
  const [bonoRemaining, setBonoRemaining] = useState<string>("");
  const [bonoExpires, setBonoExpires] = useState<string>("");

  const [meta, setMeta] = useState<{
    clientCode: string | null;
    createdAt: string;
    rgpdConsentAt: string | null;
    rgpdConsentVersion: string | null;
  } | null>(null);

  const bodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (err || okMsg) {
      bodyScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [err, okMsg]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { credentials: "same-origin" });
      const data = (await res.json()) as {
        ok?: boolean;
        client?: ClientDetail;
        tickets?: TicketRow[];
        message?: string;
      };
      if (!res.ok || !data.ok || !data.client) {
        setErr(data.message ?? "No se pudo cargar el cliente");
        return;
      }
      const c = data.client;
      setMeta({
        clientCode: c.clientCode,
        createdAt: c.createdAt,
        rgpdConsentAt: c.rgpdConsentAt,
        rgpdConsentVersion: c.rgpdConsentVersion,
      });
      setFullName(c.fullName);
      setEmail(c.email ?? "");
      setPhone(c.phone ?? "");
      setNotes(c.notes ?? "");
      setEstadoPago(c.estadoPago ?? "");
      setOrigenCliente(c.origenCliente ?? "");
      setClearLeadContact(false);
      setBonoRemaining(
        c.bonoRemainingSessions !== null && c.bonoRemainingSessions !== undefined
          ? String(c.bonoRemainingSessions)
          : "",
      );
      setBonoExpires(c.bonoExpiresAt ?? "");
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remainingNum = bonoRemaining.trim() === "" ? null : parseInt(bonoRemaining, 10);
  const hasActiveBono =
    remainingNum !== null &&
    !Number.isNaN(remainingNum) &&
    remainingNum > 0 &&
    !bonoCaducadoPorFecha(bonoExpires.trim() || null);

  async function handleSave() {
    if (!fullName.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    try {
      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        estadoPago: estadoPago.trim() || null,
        origenCliente: origenCliente === "" ? null : origenCliente,
      };
      if (clearLeadContact) {
        body.clearLeadContacted = true;
      }
      if (bonoRemaining.trim() === "") {
        body.bonoRemainingSessions = null;
      } else {
        const n = parseInt(bonoRemaining, 10);
        if (Number.isNaN(n) || n < 0) {
          setErr("Sesiones restantes del bono: número entero ≥ 0 o vacío");
          setSaving(false);
          return;
        }
        body.bonoRemainingSessions = n;
      }
      body.bonoExpiresAt = bonoExpires.trim() || null;

      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let data: { ok?: boolean; message?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string }) : {};
      } catch {
        setErr(`Respuesta no válida del servidor (${res.status})`);
        return;
      }
      if (!res.ok || !data.ok) {
        setErr(data.message ?? `No se pudo guardar (${res.status})`);
        return;
      }
      setOkMsg("Cambios guardados.");
      onSaved();
      await load();
    } catch {
      setErr("Error de red al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(92vh,820px)] w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[min(92vh,820px)] flex-col">
          <div className="shrink-0 border-b border-slate-200 px-3 py-2 sm:px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Ficha de cliente</p>
                <h2 id="client-detail-title" className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                  {loading ? "Cargando…" : fullName || "Cliente"}
                </h2>
                {meta?.clientCode ? (
                  <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">Código {meta.clientCode}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div
            ref={bodyScrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-2 sm:px-4"
          >
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-500">Cargando datos…</p>
            ) : err && !fullName ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">{err}</p>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 lg:items-start">
                  {/* Columna izquierda: contacto y RGPD */}
                  <div className="min-w-0 space-y-3">
                    <section className={MODAL_CARD_CLASS}>
                      <h3 className={MODAL_CARD_HEADING}>Contacto</h3>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Nombre completo</label>
                          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Email</label>
                          <input
                            type="email"
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Teléfono</label>
                          <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Estado pago / CRM</label>
                          <input
                            className={inputClass}
                            value={estadoPago}
                            onChange={(e) => setEstadoPago(e.target.value)}
                            placeholder="pendiente_contacto…"
                            list="estado-pago-hints"
                          />
                          <datalist id="estado-pago-hints">
                            <option value="pendiente_validacion" />
                            <option value="pendiente_contacto" />
                            <option value="validado" />
                            <option value="pagado" />
                          </datalist>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Origen</label>
                          <select
                            className={inputClass}
                            value={origenCliente}
                            onChange={(e) => setOrigenCliente(e.target.value)}
                          >
                            <option value="">— Sin clasificar —</option>
                            <option value="internet">Web</option>
                            <option value="fisico">Clínica</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-slate-600">
                            <input
                              type="checkbox"
                              checked={clearLeadContact}
                              onChange={(e) => setClearLeadContact(e.target.checked)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                            />
                            Volver a pendiente de llamada: limpia la fecha de contacto y pone el estado en
                            pendiente_contacto (listado global)
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-600">Notas</label>
                          <textarea
                            className={cn(inputClassComfort, "min-h-[4.5rem] resize-y py-1.5 text-xs")}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      {meta?.createdAt ? (
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          Alta:{" "}
                          {new Date(meta.createdAt).toLocaleString("es-ES", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      ) : null}
                    </section>

                    <section className={MODAL_CARD_CLASS}>
                      <h3 className={MODAL_CARD_HEADING}>
                        RGPD <span className="font-normal normal-case text-slate-600">(solo lectura)</span>
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        {meta?.rgpdConsentAt
                          ? `Registrado el ${new Date(meta.rgpdConsentAt).toLocaleDateString("es-ES")}${
                              meta.rgpdConsentVersion ? ` · v. ${meta.rgpdConsentVersion}` : ""
                            }`
                          : "Pendiente en clínica (listado RGPD en la misma página)."}
                      </p>
                    </section>

                  </div>

                  {/* Columna derecha: bono encima, historial debajo */}
                  <div className="flex min-w-0 flex-col gap-3 lg:border-l lg:border-slate-300 lg:pl-4">
                    <section className={MODAL_CARD_CLASS}>
                      <h3 className={MODAL_CARD_HEADING}>Bono activo</h3>
                      <p className="mt-1 text-[10px] text-slate-600">Sesiones y caducidad; vacío si no aplica.</p>
                      <div
                        className={cn(
                          "mt-1.5 rounded-lg border px-2 py-1.5 text-xs leading-snug",
                          hasActiveBono
                            ? "border-emerald-300 bg-emerald-100 text-emerald-950 shadow-sm"
                            : remainingNum !== null && !Number.isNaN(remainingNum) && remainingNum > 0 && bonoCaducadoPorFecha(bonoExpires.trim() || null)
                              ? "border-amber-300 bg-amber-100 text-amber-950 shadow-sm"
                              : "border-slate-300 bg-white text-slate-700 shadow-sm",
                        )}
                      >
                        {hasActiveBono ? (
                          <>
                            Disponibles: <strong>{remainingNum}</strong>
                            {bonoExpires.trim()
                              ? ` · cad. ${new Date(bonoExpires + "T12:00:00").toLocaleDateString("es-ES")}`
                              : " · sin caducidad"}
                          </>
                        ) : remainingNum !== null && !Number.isNaN(remainingNum) && remainingNum > 0 && bonoCaducadoPorFecha(bonoExpires.trim() || null) ? (
                          <>Sesiones en ficha pero caducidad pasada; revisa fecha.</>
                        ) : remainingNum === 0 ? (
                          <>Sin sesiones (0).</>
                        ) : (
                          <>Sin bono o sesiones vacías.</>
                        )}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-700">Sesiones restantes</label>
                          <input
                            type="number"
                            min={0}
                            className={cn(inputClass, "tabular-nums bg-white")}
                            value={bonoRemaining}
                            onChange={(e) => setBonoRemaining(e.target.value)}
                            placeholder="Vacío = sin bono"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-slate-700">Caducidad</label>
                          <input
                            type="date"
                            className={cn(inputClass, "bg-white")}
                            value={bonoExpires}
                            onChange={(e) => setBonoExpires(e.target.value)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className={MODAL_CARD_CLASS}>
                      <h3 className={MODAL_CARD_HEADING}>
                        Historial de tickets <span className="tabular-nums font-semibold text-slate-600">({tickets.length})</span>
                      </h3>
                      <div className="mt-2 max-h-[13.5rem] overflow-y-auto pr-0.5 sm:max-h-[15rem] lg:pr-1">
                        {tickets.length === 0 ? (
                          <p className="text-xs text-slate-600">No hay tickets en caja para este cliente.</p>
                        ) : (
                          <ul className="space-y-2">
                            {tickets.map((t) => (
                              <li
                                key={t.id}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-1">
                                  <span className="font-semibold tabular-nums text-slate-900">{t.ticketNumber}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(t.createdAt).toLocaleString("es-ES", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-600">
                                  {paymentLabel(t.paymentMethod)} · {formatEuroFromCents(t.totalCents)}
                                </p>
                                {t.items.length > 0 ? (
                                  <ul className="mt-1.5 space-y-0.5 border-t border-slate-200 pt-1.5 text-[10px] text-slate-700">
                                    {t.items.map((it) => (
                                      <li key={it.id} className="flex justify-between gap-1.5">
                                        <span className="min-w-0 truncate">
                                          {it.quantity}× {it.concept}
                                        </span>
                                        <span className="shrink-0 tabular-nums">{formatEuroFromCents(it.lineTotalCents)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-4">
            {!loading && err && fullName.trim() ? (
              <p className="mb-2 rounded-lg border border-rose-300 bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-900">
                {err}
              </p>
            ) : null}
            {!loading && okMsg && fullName.trim() ? (
              <p className="mb-2 rounded-lg border border-blue-300 bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-900">
                {okMsg}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cerrar
              </Button>
              <Button type="button" variant="gradient" onClick={() => void handleSave()} disabled={saving || loading}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
