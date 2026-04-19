"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { staffAvatarSrc } from "@/lib/hero-staff-data";
import {
  padHourlyTariffs,
  STAFF_HOURLY_TARIFF_SLOTS,
  type HourlyTariffSlot,
} from "@/lib/staff-hourly-tariffs";
import { Button } from "@/components/ui/button";

export type StaffGridRow = {
  id: string;
  name: string;
  role: string;
  /** Código de usuario (login); solo lectura en ficha. */
  employee_code: string | null;
  salesCount: number;
  totalSalesEuros: number;
  bizumEuros: number;
  cashEuros: number;
  workedHours: number;
  email: string | null;
  phone: string | null;
  public_profile: boolean;
  public_specialty: string | null;
  public_bio: string | null;
  avatarUrl: string | null;
  hourly_tariffs: unknown;
};

function euro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hours(value: number): string {
  return `${value.toFixed(1)} h`;
}

type StaffRole = "admin" | "staff";

type DraftState = {
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  /** Nuevo PIN (4 dígitos); vacío = no cambiar. */
  newPin: string;
  public_profile: boolean;
  public_specialty: string;
  public_bio: string;
  tariffs: HourlyTariffSlot[];
};

function draftFromRow(row: StaffGridRow): DraftState {
  return {
    fullName: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role === "admin" ? "admin" : "staff",
    newPin: "",
    public_profile: row.public_profile,
    public_specialty: row.public_specialty ?? "",
    public_bio: row.public_bio ?? "",
    tariffs: padHourlyTariffs(row.hourly_tariffs),
  };
}

export function StaffMetricsGrid({
  rows,
  onExpandedChange,
}: {
  rows: StaffGridRow[];
  /** Notifica cuando se abre o cierra la ficha expandida (p. ej. para compactar el panel de ranking). */
  onExpandedChange?: (staffId: string | null) => void;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);

  const expandedRow = useMemo(
    () => (expandedId ? rows.find((r) => r.id === expandedId) : null),
    [rows, expandedId],
  );

  const defaultDraft = useMemo(
    () => (expandedRow ? draftFromRow(expandedRow) : null),
    [expandedRow],
  );
  /** Evita un frame sin datos: el primer render con ficha abierta puede tener `draft` aún null. */
  const formDraft = draft ?? defaultDraft;

  useLayoutEffect(() => {
    if (!expandedId) {
      setDraft(null);
      setAvatarFile(null);
      setAvatarBlobUrl(null);
      setMsg(null);
      return;
    }
    const row = rows.find((r) => r.id === expandedId);
    if (!row) {
      setExpandedId(null);
      return;
    }
    setDraft(draftFromRow(row));
    setAvatarFile(null);
    setAvatarBlobUrl(null);
    setMsg(null);
  }, [expandedId, rows]);

  useEffect(() => {
    onExpandedChange?.(expandedId);
  }, [expandedId, onExpandedChange]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);

  const toggleCard = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const avatarDisplaySrc = expandedRow
    ? avatarBlobUrl || expandedRow.avatarUrl || staffAvatarSrc(expandedRow.name)
    : "";

  async function handleSave() {
    if (!expandedId || !formDraft) return;
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("fullName", formDraft.fullName.trim());
      fd.append("email", formDraft.email.trim().toLowerCase());
      fd.append("phone", formDraft.phone.trim());
      fd.append("publicProfile", formDraft.public_profile ? "1" : "0");
      fd.append("publicSpecialty", formDraft.public_specialty);
      fd.append("publicBio", formDraft.public_bio);
      fd.append("role", formDraft.role);
      if (formDraft.newPin.trim()) {
        fd.append("newPin", formDraft.newPin.trim());
      }
      fd.append(
        "hourlyTariffs",
        JSON.stringify(
          formDraft.tariffs.slice(0, STAFF_HOURLY_TARIFF_SLOTS).map((t) => ({
            label: t.label,
            cents_per_hour: t.cents_per_hour,
          })),
        ),
      );
      if (avatarFile && formDraft.public_profile) {
        fd.append("avatar", avatarFile);
      }

      const res = await fetch(`/api/admin/staff/${expandedId}`, {
        method: "PATCH",
        body: fd,
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; avatarWarning?: string };
      if (!res.ok || !data.ok) {
        setMsg(data.message ?? "Error al guardar");
        return;
      }
      let t = "Guardado.";
      if (data.avatarWarning) t += ` ${data.avatarWarning}`;
      setMsg(t);
      setAvatarFile(null);
      router.refresh();
    } catch {
      setMsg("Error de red");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100";

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 xl:auto-rows-min">
      {rows.map((s) => {
        const isOpen = expandedId === s.id;
        return (
          <div
            key={s.id}
            className={cn(
              "min-w-0 transition-[grid-column] duration-200",
              isOpen && "sm:col-span-2 sm:row-span-2 xl:col-span-3 xl:row-span-2",
            )}
          >
            {!isOpen ? (
              <button
                type="button"
                onClick={() => toggleCard(s.id)}
                className={cn(
                  "w-full rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-sm transition hover:border-blue-200/80 hover:bg-white hover:shadow-md",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {s.role}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-slate-500">Ventas</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{s.salesCount}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-slate-500">Horas</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{hours(s.workedHours)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 px-2 py-2">
                    <p className="text-slate-500">Bizum</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{euro(s.bizumEuros)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-2">
                    <p className="text-slate-500">Efectivo</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{euro(s.cashEuros)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Total vendido: {euro(s.totalSalesEuros)}
                </p>
                <p className="mt-2 text-[10px] text-slate-400">Pulsa para ficha y tarifas / h</p>
              </button>
            ) : isOpen && expandedRow && formDraft ? (
              <div
                className="rounded-2xl border border-blue-200/80 bg-white p-3 shadow-md sm:p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Ficha y tarifas
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2 text-xs"
                      onClick={() => setExpandedId(null)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      Cerrar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1 bg-gradient-to-r from-blue-600 to-cyan-500 px-2 text-xs text-white"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "…" : "Guardar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* Fila 1: rol (mismo ancho que la foto) alineado con los títulos de los campos */}
                  <div className="flex min-w-0 flex-wrap items-end gap-3">
                    <div className="w-20 shrink-0">
                      <button
                        type="button"
                        title="Cambiar entre Admin y Staff"
                        onClick={() =>
                          setDraft((d) => {
                            const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                            if (!base) return d;
                            const next: StaffRole = base.role === "admin" ? "staff" : "admin";
                            return { ...base, role: next };
                          })
                        }
                        className={cn(
                          "flex h-6 w-full items-center justify-center truncate rounded-full px-1 text-[10px] font-medium capitalize transition hover:opacity-90",
                          formDraft.role === "admin"
                            ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
                        )}
                      >
                        {formDraft.role}
                      </button>
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                      <div className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-600">Nombre</span>
                      </div>
                      <div className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-600">
                          Especialidad
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-600">Email</span>
                      </div>
                      <div className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-600">Teléfono</span>
                      </div>
                    </div>
                  </div>

                  {/* Avatar + elegir imagen pegados; bio más bajo */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex w-20 shrink-0 flex-col gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarDisplaySrc}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover"
                      />
                      <div className="flex flex-col gap-0.5">
                        <input
                          id={`avatar-${s.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={!formDraft.public_profile}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setAvatarFile(f ?? null);
                          }}
                          className="sr-only"
                        />
                        <label
                          htmlFor={`avatar-${s.id}`}
                          title={avatarFile?.name}
                          className={cn(
                            "flex h-8 w-20 cursor-pointer items-center justify-center truncate rounded-md border border-slate-200 bg-slate-50 px-1 text-center text-[9px] font-medium text-slate-700 transition hover:bg-slate-100",
                            !formDraft.public_profile && "pointer-events-none opacity-50",
                          )}
                        >
                          {avatarFile ? avatarFile.name : "Elegir imagen"}
                        </label>
                      </div>
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
                      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                        <div className="min-w-0">
                          <input
                            className={inputCls}
                            aria-label="Nombre"
                            value={formDraft.fullName}
                            onChange={(e) =>
                              setDraft((d) => {
                                const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                if (!base) return d;
                                return { ...base, fullName: e.target.value };
                              })
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <input
                            className={inputCls}
                            aria-label="Especialidad"
                            value={formDraft.public_specialty}
                            onChange={(e) =>
                              setDraft((d) => {
                                const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                if (!base) return d;
                                return { ...base, public_specialty: e.target.value };
                              })
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <input
                            type="email"
                            className={inputCls}
                            aria-label="Email"
                            value={formDraft.email}
                            onChange={(e) =>
                              setDraft((d) => {
                                const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                if (!base) return d;
                                return { ...base, email: e.target.value };
                              })
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <input
                            type="tel"
                            className={inputCls}
                            aria-label="Teléfono"
                            value={formDraft.phone}
                            onChange={(e) =>
                              setDraft((d) => {
                                const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                if (!base) return d;
                                return { ...base, phone: e.target.value };
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-1 md:grid-cols-4 md:items-end">
                        <div className="min-w-0 md:col-span-3">
                          <span className="block text-[10px] font-medium text-slate-600">
                            Bio (web)
                          </span>
                        </div>
                        <div className="flex min-w-0 gap-2 md:col-span-1">
                          <span className="block min-w-0 flex-1 text-[10px] font-medium text-slate-600">
                            Código PIN
                          </span>
                          <span className="block min-w-0 flex-1 text-[10px] font-medium text-slate-600">
                            Código usuario
                          </span>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4 md:items-start">
                        {formDraft.public_profile ? (
                          <div className="min-w-0 md:col-span-3">
                            <textarea
                              rows={3}
                              className={cn(
                                inputCls,
                                "min-h-[3.75rem] w-full resize-none md:min-h-16",
                              )}
                              aria-label="Bio (web)"
                              value={formDraft.public_bio}
                              onChange={(e) =>
                                setDraft((d) => {
                                  const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                  if (!base) return d;
                                  return { ...base, public_bio: e.target.value };
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div
                            className="hidden min-h-[3.75rem] md:col-span-3 md:block md:min-h-16"
                            aria-hidden
                          />
                        )}
                        <div className="flex min-w-0 flex-col gap-2 md:col-span-1">
                          <div className="flex min-w-0 gap-2">
                            <input
                              type="password"
                              inputMode="numeric"
                              autoComplete="new-password"
                              placeholder="••••"
                              maxLength={4}
                              className={cn(inputCls, "min-w-0 flex-1 px-1.5 text-center tracking-wider")}
                              aria-label="Código PIN"
                              value={formDraft.newPin}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                setDraft((d) => {
                                  const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                  if (!base) return d;
                                  return { ...base, newPin: v };
                                });
                              }}
                            />
                            <input
                              className={cn(
                                inputCls,
                                "min-w-0 flex-1 cursor-not-allowed border-slate-200 bg-slate-200/90 font-bold tabular-nums text-slate-900 shadow-inner ring-1 ring-slate-300/60",
                              )}
                              readOnly
                              tabIndex={-1}
                              value={expandedRow?.employee_code ?? "—"}
                              aria-label="Código usuario (solo lectura)"
                            />
                          </div>
                          <label
                            htmlFor={`pp-${s.id}`}
                            className="flex cursor-pointer items-center gap-1.5 text-[11px] leading-tight text-slate-700"
                          >
                            <input
                              id={`pp-${s.id}`}
                              type="checkbox"
                              checked={formDraft.public_profile}
                              onChange={(e) =>
                                setDraft((d) => {
                                  const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                                  if (!base) return d;
                                  return { ...base, public_profile: e.target.checked };
                                })
                              }
                              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                            />
                            <span className="whitespace-nowrap">Perfil público</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Tarifa por hora (€/h) — hasta {STAFF_HOURLY_TARIFF_SLOTS}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                    {formDraft.tariffs.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1"
                      >
                        <input
                          className={cn(inputCls, "min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px]")}
                          placeholder={`Concepto ${idx + 1}`}
                          value={slot.label}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDraft((d) => {
                              const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                              if (!base) return d;
                              const next = [...base.tariffs];
                              next[idx] = { ...next[idx], label: v };
                              return { ...base, tariffs: next };
                            });
                          }}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className={cn(inputCls, "w-[4.5rem] shrink-0 border-slate-200 px-1 py-1 text-right text-[11px]")}
                          value={slot.cents_per_hour ? (slot.cents_per_hour / 100).toFixed(2) : ""}
                          placeholder="€"
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            const n = parseFloat(raw);
                            const cents = Number.isFinite(n) ? Math.round(n * 100) : 0;
                            setDraft((d) => {
                              const base = d ?? (expandedRow ? draftFromRow(expandedRow) : null);
                              if (!base) return d;
                              const next = [...base.tariffs];
                              next[idx] = { ...next[idx], cents_per_hour: Math.max(0, cents) };
                              return { ...base, tariffs: next };
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {msg ? (
                  <p className="mt-2 text-[11px] text-blue-800">{msg}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <span>Ventas: {s.salesCount}</span>
                  <span>·</span>
                  <span>Horas registradas: {hours(s.workedHours)}</span>
                  <span>·</span>
                  <span>Total vendido: {euro(s.totalSalesEuros)}</span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
