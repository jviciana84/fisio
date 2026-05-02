"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { BonoCardWithToolbar, type BonoPrettyCardData } from "@/components/bonos/BonoPrettyCard";
import { Button } from "@/components/ui/button";

export type BonosActivosRow = BonoPrettyCardData & {
  purchasedAtIso: string;
  clientFullName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
};

function daysUntil(dateIso: string) {
  const today = new Date();
  const target = new Date(`${dateIso}T23:59:59`);
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function BonosActivosView({
  bonos,
  stats,
}: {
  bonos: BonosActivosRow[];
  stats: { expiringSoon: number; pendingSessions: number };
}) {
  const [detail, setDetail] = useState<BonosActivosRow | null>(null);

  return (
    <>
      <section className="glass-panel glass-tint-blue rounded-3xl border border-blue-100/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Bonos</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Bonos activos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tarjeta con PDF descargable y accesos para compartir. Desde aquí recuperas QR y código en cualquier momento.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Activos</p>
            <p className="text-xl font-semibold text-slate-900">{bonos.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-700">Caducan en 30 días</p>
            <p className="text-xl font-semibold text-amber-900">{stats.expiringSoon}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Sesiones pendientes</p>
            <p className="text-xl font-semibold text-slate-900">{stats.pendingSessions}</p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl border border-white/70 bg-white/80 p-3">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Sesiones</th>
                <th className="px-3 py-2">Compra</th>
                <th className="px-3 py-2">Caducidad</th>
                <th className="px-3 py-2">Estado</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Tarjeta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bonos.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={8}>
                    No hay bonos activos ahora mismo.
                  </td>
                </tr>
              ) : (
                bonos.map((bono) => {
                  const d = daysUntil(bono.expiresAt);
                  const status =
                    d < 0 ? "Caducado" : d <= 30 ? `Caduca en ${d} día${d === 1 ? "" : "s"}` : "Vigente";
                  return (
                    <tr key={bono.id}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{bono.uniqueCode}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{bono.clientFullName ?? "Cliente"}</p>
                        <p className="text-xs text-slate-500">
                          {bono.clientPhone ?? "Sin teléfono"} · {bono.clientEmail ?? "Sin email"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-slate-800">{bono.productName}</td>
                      <td className="px-3 py-2 text-slate-800">
                        {bono.sessionsRemaining}/{bono.sessionsTotal}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{new Date(bono.purchasedAtIso).toLocaleDateString("es-ES")}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {new Date(`${bono.expiresAt}T12:00:00`).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            d < 0
                              ? "bg-rose-100 text-rose-700"
                              : d <= 30
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setDetail(bono)}
                          title="Ver tarjeta bono (PDF, compartir…)"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
                        >
                          <CreditCard className="h-3.5 w-3.5" aria-hidden />
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detail ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-2xl min-w-0 overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Tarjeta bono</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setDetail(null)}>
                Cerrar
              </Button>
            </div>
            <BonoCardWithToolbar bono={detail} />
          </div>
        </div>
      ) : null}
    </>
  );
}
