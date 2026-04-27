"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PackagePlus, Pencil, Star, Trash2 } from "lucide-react";
import { DashboardAddFabButton } from "@/components/dashboard/DashboardAddFabButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  formatEuroEsTwoDecimals,
  formatEurosFieldFromNumber,
  formatIntegerEs,
  parseSpanishDecimalInput,
} from "@/lib/format-es";

type ProductMetric = {
  id: string;
  name: string;
  description: string | null;
  productCode: string;
  priceEuros: number;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
  revenueEuros: number;
  lastSaleAt: string | null;
  sellers: string[];
};

const modalInputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

export function ProductsOverviewPage() {
  const [products, setProducts] = useState<ProductMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductMetric | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createCode, setCreateCode] = useState<string | null>(null);
  const [createCodeLoading, setCreateCodeLoading] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<ProductMetric | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

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

  const loadProductCode = useCallback(async (opts?: { silent?: boolean }) => {
    setCreateCodeLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = (await res.json()) as { productCode?: string; message?: string };
      if (!res.ok) {
        setCreateCode(null);
        if (!opts?.silent) {
          setMessage({
            type: "err",
            text: data.message ?? "No se pudo obtener el código de producto.",
          });
        }
        return;
      }
      if (data.productCode) setCreateCode(data.productCode);
    } catch {
      setCreateCode(null);
      if (!opts?.silent) {
        setMessage({ type: "err", text: "Error de red al obtener el código de producto." });
      }
    } finally {
      setCreateCodeLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    setMessage(null);
    setCreateOpen(true);
    setCreateName("");
    setCreateDescription("");
    setCreatePrice("");
    setCreateCode(null);
    void loadProductCode();
  };

  const openEditModal = (p: ProductMetric) => {
    setMessage(null);
    setEditTarget(p);
    setEditName(p.name);
    setEditDescription(p.description?.trim() ?? "");
    setEditPrice(formatEurosFieldFromNumber(p.priceEuros));
    setEditCode(p.productCode);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.productCode, p.description ?? "", ...p.sellers].join(" ").toLowerCase().includes(q),
    );
  }, [products, search]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  /** Totales sobre todos los productos filtrados (todas las páginas). */
  const productsTableFooter = useMemo(() => {
    let totalSales = 0;
    let totalRevenueEuros = 0;
    for (const p of filtered) {
      totalSales += p.salesCount;
      totalRevenueEuros += p.revenueEuros;
    }
    return { count: filtered.length, totalSales, totalRevenueEuros };
  }, [filtered]);

  const createPriceNum = useMemo(() => parseSpanishDecimalInput(createPrice), [createPrice]);

  const canSubmitCreate = useMemo(() => {
    if (!createName.trim() || createName.trim().length < 2) return false;
    if (!Number.isFinite(createPriceNum) || createPriceNum < 0) return false;
    if (!createCode || createCodeLoading) return false;
    return true;
  }, [createName, createPriceNum, createCode, createCodeLoading]);

  const editPriceNum = useMemo(() => parseSpanishDecimalInput(editPrice), [editPrice]);

  const canSubmitEdit = useMemo(() => {
    if (!editTarget) return false;
    if (!editName.trim() || editName.trim().length < 2) return false;
    if (!Number.isFinite(editPriceNum) || editPriceNum < 0) return false;
    if (!/^\d{4}$/.test(editCode.trim())) return false;
    return true;
  }, [editTarget, editName, editPriceNum, editCode]);

  async function onSubmitCreate(e: FormEvent) {
    e.preventDefault();
    if (!canSubmitCreate || !createCode) return;
    setCreateSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          priceEuros: createPriceNum,
          productCode: createCode,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        if (res.status === 409) void loadProductCode({ silent: true });
        setMessage({ type: "err", text: data.message ?? "Error al crear el producto." });
        return;
      }
      setMessage({ type: "ok", text: "Producto creado correctamente." });
      setCreateOpen(false);
      await loadProducts();
    } catch {
      setMessage({ type: "err", text: "Error de red." });
    } finally {
      setCreateSaving(false);
    }
  }

  async function onSubmitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget || !canSubmitEdit) return;
    setEditSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() ? editDescription.trim() : null,
          priceEuros: editPriceNum,
          productCode: editCode.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo guardar el producto." });
        return;
      }
      setMessage({ type: "ok", text: `Producto actualizado: ${editName.trim()}.` });
      setEditTarget(null);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? {
                ...p,
                name: editName.trim(),
                description: editDescription.trim() ? editDescription.trim() : null,
                priceEuros: editPriceNum,
                productCode: editCode.trim(),
              }
            : p,
        ),
      );
    } catch {
      setMessage({ type: "err", text: "Error de red al guardar." });
    } finally {
      setEditSaving(false);
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

  async function toggleFavorite(productId: string, nextFavorite: boolean) {
    if (favoriteSavingIds.includes(productId)) return;
    setFavoriteSavingIds((prev) => [...prev, productId]);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isFavorite: nextFavorite } : p)),
    );
    try {
      const res = await fetch(`/api/admin/cash/products/${encodeURIComponent(productId)}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextFavorite }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isFavorite: !nextFavorite } : p)),
        );
        setMessage({ type: "err", text: data.message ?? "No se pudo actualizar favorito." });
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isFavorite: !nextFavorite } : p)),
      );
      setMessage({ type: "err", text: "Error de red al actualizar favorito." });
    } finally {
      setFavoriteSavingIds((prev) => prev.filter((id) => id !== productId));
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
              Consulta rendimiento por producto, quién lo vende y gestiona el catálogo.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[min(100%,22rem)] sm:flex-row sm:items-center">
            <DashboardAddFabButton
              icon={PackagePlus}
              label="Añadir producto"
              onClick={openCreateModal}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto, código o vendedor..."
              className="w-full rounded-xl border border-slate-200 bg-white/75 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
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

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-center">Fav</th>
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
                    <td className="px-4 py-8 text-slate-500" colSpan={8}>
                      Cargando productos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={8}>
                      No hay productos para mostrar.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paginated.map((p) => (
                      <tr key={p.id} className="align-top">
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            title={p.isFavorite ? "Quitar favorito" : "Marcar favorito"}
                            aria-label={p.isFavorite ? "Quitar favorito" : "Marcar favorito"}
                            disabled={favoriteSavingIds.includes(p.id)}
                            onClick={() => void toggleFavorite(p.id, !p.isFavorite)}
                            className={`inline-flex rounded-md p-1.5 transition ${
                              p.isFavorite
                                ? "text-amber-500 hover:bg-amber-50"
                                : "text-slate-400 hover:bg-slate-100 hover:text-amber-500"
                            } disabled:opacity-40`}
                          >
                            <Star className={`h-4 w-4 ${p.isFavorite ? "fill-current" : ""}`} aria-hidden />
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">Código {p.productCode}</p>
                          {p.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{p.description}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 font-medium tabular-nums text-slate-900">
                          {formatEuroEsTwoDecimals(p.priceEuros)}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-800">{formatIntegerEs(p.salesCount)}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">{formatEuroEsTwoDecimals(p.revenueEuros)}</td>
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
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => openEditModal(p)}
                              className="inline-flex rounded-md p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Editar</span>
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              disabled={savingId === p.id}
                              onClick={() => setDeleteTarget(p)}
                              className="inline-flex rounded-md p-2 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr
                      className="border-t-2 border-slate-200/90 bg-slate-50/95 text-slate-800"
                      aria-label="Totales de todos los productos de la tabla (todas las páginas)"
                    >
                      <td colSpan={2} className="px-4 py-3 align-top">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Totales</span>
                        <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-500">
                          {productsTableFooter.count}{" "}
                          {productsTableFooter.count === 1 ? "producto" : "productos"}
                          {totalPages > 1
                            ? ` en ${totalPages} páginas · suma de todas las filas filtradas`
                            : null}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-medium tabular-nums text-slate-500">—</td>
                      <td className="px-4 py-3 align-top text-sm font-bold tabular-nums text-slate-900">
                        {productsTableFooter.count > 0 ? formatIntegerEs(productsTableFooter.totalSales) : "—"}
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-bold tabular-nums text-slate-900">
                        {productsTableFooter.count > 0
                          ? formatEuroEsTwoDecimals(productsTableFooter.totalRevenueEuros)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500">—</td>
                      <td className="px-4 py-3 align-top text-slate-500">—</td>
                      <td className="px-4 py-3 align-top" aria-hidden />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          {!loading && totalRows > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/50 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <label htmlFor="products-page-size" className="whitespace-nowrap font-medium">
                  Filas por página
                </label>
                <select
                  id="products-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[12px] font-medium text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="tabular-nums text-slate-500">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRows)} de {totalRows}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ««
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-700">
                  Página {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  »»
                </button>
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const raw = String(fd.get("goto") ?? "").trim();
                    const n = parseInt(raw, 10);
                    if (!Number.isFinite(n)) return;
                    setPage(Math.min(Math.max(1, n), totalPages));
                  }}
                >
                  <label htmlFor="products-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                    Ir a
                  </label>
                  <input
                    id="products-goto-page"
                    name="goto"
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={String(page)}
                    className="w-14 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-center text-[12px] tabular-nums text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    aria-label="Número de página"
                  />
                  <Button type="submit" variant="gradient" size="sm" className="h-7 px-2.5 text-[11px]">
                    Ir
                  </Button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-title"
        >
          <div className="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="create-product-title" className="text-lg font-semibold text-slate-900">
              Nuevo producto
            </h3>
            <p className="mt-1 text-sm text-slate-600">Completa los datos y guarda en el catálogo.</p>
            <form onSubmit={onSubmitCreate} className="mt-5 space-y-4">
              <div>
                <label htmlFor="modal-create-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  id="modal-create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className={modalInputClass}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="modal-create-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripción <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="modal-create-desc"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className={cn(modalInputClass, "resize-y")}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div>
                  <label htmlFor="modal-create-price" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Precio (€)
                  </label>
                  <input
                    id="modal-create-price"
                    type="text"
                    inputMode="decimal"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    className={modalInputClass}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Código producto</span>
                  <div
                    className="flex min-h-[2.625rem] w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xl font-semibold tabular-nums tracking-widest text-slate-900 shadow-sm"
                    title="Asignado al abrir el formulario"
                  >
                    {createCodeLoading ? (
                      <span className="text-sm text-slate-400">Cargando…</span>
                    ) : createCode ? (
                      createCode
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  {!createCodeLoading && !createCode ? (
                    <button
                      type="button"
                      onClick={() => void loadProductCode()}
                      className="mt-2 text-left text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
                    >
                      Reintentar código
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                  disabled={createSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={!canSubmitCreate || createSaving}>
                  {createSaving ? "Guardando…" : "Crear producto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
        >
          <div className="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="edit-product-title" className="text-lg font-semibold text-slate-900">
              Editar producto
            </h3>
            <p className="mt-1 text-sm text-slate-600">Modifica los datos y guarda los cambios.</p>
            <form onSubmit={onSubmitEdit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="modal-edit-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  id="modal-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={modalInputClass}
                  required
                  minLength={2}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="modal-edit-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripción <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="modal-edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className={cn(modalInputClass, "resize-y")}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div>
                  <label htmlFor="modal-edit-price" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Precio (€)
                  </label>
                  <input
                    id="modal-edit-price"
                    type="text"
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={modalInputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modal-edit-code" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Código (4 cifras)
                  </label>
                  <input
                    id="modal-edit-code"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={cn(modalInputClass, "font-mono tabular-nums tracking-widest")}
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    aria-invalid={editCode.length > 0 && editCode.length < 4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTarget(null)}
                  disabled={editSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={!canSubmitEdit || editSaving}>
                  {editSaving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar producto</h3>
            <p className="mt-2 text-sm text-slate-600">
              Vas a borrar <span className="font-semibold text-slate-900">{deleteTarget.name}</span>. Esta acción no se
              puede deshacer y el producto desaparecerá del catálogo.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="text-sm"
                onClick={() => void deleteProduct()}
                disabled={savingId === deleteTarget.id}
              >
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
