"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export default function AltaProductosPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [productCode, setProductCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadProductCode = useCallback(async (opts?: { silent?: boolean }) => {
    setCodeLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = (await res.json()) as { productCode?: string; message?: string };
      if (!res.ok) {
        setProductCode(null);
        if (!opts?.silent) {
          setMessage({
            type: "err",
            text: data.message ?? "No se pudo obtener el código de producto.",
          });
        }
        return;
      }
      if (data.productCode) setProductCode(data.productCode);
    } catch {
      setProductCode(null);
      if (!opts?.silent) {
        setMessage({ type: "err", text: "Error de red al obtener el código de producto." });
      }
    } finally {
      setCodeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProductCode();
  }, [loadProductCode]);

  const priceNum = useMemo(() => {
    const n = parseFloat(priceEuros.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [priceEuros]);

  const canSubmit = useMemo(() => {
    if (!name.trim() || name.trim().length < 2) return false;
    if (!Number.isFinite(priceNum) || priceNum < 0) return false;
    if (!productCode || codeLoading) return false;
    return true;
  }, [name, priceNum, productCode, codeLoading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !productCode) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          priceEuros: priceNum,
          productCode,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          await loadProductCode({ silent: true });
        }
        setMessage({ type: "err", text: data.message ?? "Error al crear el producto" });
        return;
      }
      setMessage({ type: "ok", text: "Producto creado correctamente." });
      setName("");
      setDescription("");
      setPriceEuros("");
      await loadProductCode({ silent: true });
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-5xl overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-0">
          <div className="min-w-0 flex-1 lg:max-w-md lg:pr-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Configuración
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Alta de productos
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Añade artículos o servicios al catálogo con nombre, descripción opcional,
              precio en euros y un código interno de cuatro cifras generado al abrir
              este formulario.
            </p>
          </div>

          <div
            className="hidden shrink-0 lg:block lg:w-px lg:self-stretch lg:bg-gradient-to-b lg:from-transparent lg:via-slate-300 lg:to-transparent"
            aria-hidden
          />
          <hr className="border-slate-200 lg:hidden" />

          <div className="min-w-0 flex-1 lg:min-w-[min(100%,28rem)] lg:pl-10 xl:min-w-[32rem]">
            <div
              className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] md:p-8"
              role="region"
              aria-labelledby="alta-producto-title"
            >
              <h2
                id="alta-producto-title"
                className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
              >
                Nuevo producto
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Completa los datos y pulsa crear producto.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="product-name"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="product-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    required
                    minLength={2}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-desc"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Descripción{" "}
                    <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <textarea
                    id="product-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                    autoComplete="off"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div>
                    <label
                      htmlFor="product-price"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Precio (€)
                    </label>
                    <input
                      id="product-price"
                      type="text"
                      inputMode="decimal"
                      value={priceEuros}
                      onChange={(e) => setPriceEuros(e.target.value)}
                      className={inputClass}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Código producto
                    </span>
                    <div
                      className="flex min-h-[2.625rem] w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xl font-semibold tabular-nums tracking-widest text-slate-900 shadow-sm"
                      title="Asignado al cargar el formulario"
                    >
                      {codeLoading ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : productCode ? (
                        productCode
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    {!codeLoading && !productCode ? (
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

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Crear producto"}
                </button>

                {message ? (
                  <p
                    className={`rounded-xl px-4 py-3 text-sm ${
                      message.type === "ok"
                        ? "border border-blue-200 bg-blue-50 text-blue-800"
                        : "border border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {message.text}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
