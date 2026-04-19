"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ClientRow = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export function ClientsOverviewPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = (await res.json()) as { ok?: boolean; clients?: ClientRow[]; message?: string };
      if (!res.ok || !data.ok || !data.clients) {
        setMessage({ type: "err", text: data.message ?? "No se pudieron cargar los clientes." });
        return;
      }
      setClients(data.clients);
    } catch {
      setMessage({ type: "err", text: "Error de red al cargar clientes." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.fullName, c.clientCode ?? "", c.email ?? "", c.phone ?? "", c.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [clients, search]);

  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-7xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Clientes</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Base de clientes
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Personas registradas para caja y reservas. Busca por nombre, código, email o teléfono.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
            >
              Panel
            </Link>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full min-w-[12rem] max-w-md rounded-xl border border-slate-200 bg-white/75 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {message ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border border-blue-200 bg-blue-50 text-blue-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-white/70 bg-white/70 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={5}>
                      Cargando clientes…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={5}>
                      {clients.length === 0 ? "No hay clientes activos." : "Ningún resultado para la búsqueda."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.fullName}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{c.clientCode ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{c.phone ?? "—"}</td>
                      <td className="max-w-[14rem] px-4 py-3 text-slate-600">
                        <span className="line-clamp-2" title={c.notes ?? undefined}>
                          {c.notes?.trim() ? c.notes : "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Los clientes se crean al reservar, por Bizum/bono o desde caja. Para altas de productos usa{" "}
          <Link href="/dashboard/configuracion/productos" className="font-medium text-blue-700 underline">
            Alta de productos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
