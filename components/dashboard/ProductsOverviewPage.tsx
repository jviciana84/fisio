"use client";

import { useEffect, useMemo, useState } from "react";

type ProductMetric = {
  id: string;
  name: string;
  productCode: string;
  priceEuros: number;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
  revenueEuros: number;
  lastSaleAt: string | null;
  sellers: string[];
};

function euro(v: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

export function ProductsOverviewPage() {
  const [products, setProducts] = useState<ProductMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductMetric | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/metrics");
      const data = (await res.json()) as { ok?: boolean; products?: ProductMetric[]; message?: string };
      if (!res.ok || !data.ok || !data.products) {
        setMessage({ type: "err", text: data.message ?? "No se pudieron cargar productos." });
        return;
      }
      setProducts(data.products);
    } catch {
      setMessage({ type: "err", text: "Error de red al cargar productos." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.productCode, ...p.sellers].join(" ").toLowerCase().includes(q),
    );
  }, [products, search]);

  async function savePrice(product: ProductMetric) {
    const raw = editing[product.id];
    const parsed = Number(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setMessage({ type: "err", text: `Precio inválido para ${product.name}` });
      return;
    }
    setSavingId(product.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceEuros: parsed }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo actualizar el precio." });
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, priceEuros: parsed } : p)),
      );
      setMessage({ type: "ok", text: `Precio actualizado en ${product.name}.` });
    } catch {
      setMessage({ type: "err", text: "Error de red al actualizar precio." });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return;
    setSavingId(deleteTarget.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo eliminar el producto." });
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setMessage({ type: "ok", text: `Producto eliminado: ${deleteTarget.name}.` });
      setDeleteTarget(null);
    } catch {
      setMessage({ type: "err", text: "Error de red al eliminar producto." });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-7xl p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Productos</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Catálogo y métricas de venta
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Consulta rendimiento por producto, quién lo vende y ajusta precios al momento.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, código o vendedor..."
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white/75 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
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

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Ventas</th>
                  <th className="px-4 py-3">Ingresos</th>
                  <th className="px-4 py-3">Última venta</th>
                  <th className="px-4 py-3">Usuarios venta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      Cargando productos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      No hay productos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">Código {p.productCode}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            value={editing[p.id] ?? String(p.priceEuros)}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <button
                            type="button"
                            onClick={() => void savePrice(p)}
                            disabled={savingId === p.id}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            Guardar
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">{p.salesCount}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{euro(p.revenueEuros)}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {p.lastSaleAt
                          ? new Date(p.lastSaleAt).toLocaleString("es-ES", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Sin ventas"}
                      </td>
                      <td className="px-4 py-4">
                        {p.sellers.length ? (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {p.sellers.map((s) => (
                              <span
                                key={`${p.id}-${s}`}
                                className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Sin registro</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar producto</h3>
            <p className="mt-2 text-sm text-slate-600">
              Vas a borrar <span className="font-semibold text-slate-900">{deleteTarget.name}</span>.
              Esta acción no se puede deshacer y el producto desaparecerá del catálogo.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void deleteProduct()}
                disabled={savingId === deleteTarget.id}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
