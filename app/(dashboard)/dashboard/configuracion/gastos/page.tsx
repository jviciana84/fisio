"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const CATEGORY_SEEDS = [
  "Alquiler",
  "Luz",
  "Agua",
  "Gas",
  "Internet",
  "Telefonía",
  "Seguros",
  "Material",
  "Servicios",
  "Impuestos",
  "Personal",
  "General",
];

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Sin periodicidad (puntual)" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

function mergeCategoryOptions(seeds: string[], fromDb: string[]): string[] {
  const set = new Set<string>();
  for (const s of seeds) set.add(s);
  for (const c of fromDb) {
    if (c?.trim()) set.add(c.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export default function AltaGastosPage() {
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(CATEGORY_SEEDS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/expense-categories");
      const data = (await res.json()) as { ok?: boolean; categories?: string[] };
      if (res.ok && data.ok && Array.isArray(data.categories)) {
        setCategoryOptions(mergeCategoryOptions(CATEGORY_SEEDS, data.categories));
      }
    } catch {
      /* mantener seeds */
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amountEuros.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [amountEuros]);

  const canSubmit = useMemo(() => {
    if (!concept.trim() || concept.trim().length < 2) return false;
    if (!category.trim()) return false;
    if (!Number.isFinite(amountNum) || amountNum <= 0) return false;
    return true;
  }, [concept, category, amountNum]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.trim(),
          notes: notes.trim() || undefined,
          category: category.trim(),
          amountEuros: amountNum,
          recurrence,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "Error al registrar el gasto" });
        return;
      }
      setMessage({ type: "ok", text: "Gasto registrado correctamente." });
      setConcept("");
      setNotes("");
      setCategory("");
      setAmountEuros("");
      setRecurrence("monthly");
      await loadCategories();
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
              Gastos fijos
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Registra cargos recurrentes (alquiler, luz, internet, agua, etc.): concepto,
              categoría, importe y periodicidad. Las categorías que vayas usando se guardan y
              podrás elegirlas de nuevo en el desplegable o escribir una nueva.
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
              aria-labelledby="alta-gasto-title"
            >
              <h2
                id="alta-gasto-title"
                className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
              >
                Nuevo cargo
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Completa los datos y pulsa registrar gasto.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div>
                    <label
                      htmlFor="expense-concept"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Concepto
                    </label>
                    <input
                      id="expense-concept"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      className={inputClass}
                      required
                      minLength={2}
                      placeholder="Ej. Luz oficina"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="expense-category"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Categoría
                    </label>
                    <input
                      id="expense-category"
                      list="category-suggestions"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClass}
                      required
                      placeholder="Escribe o elige…"
                      autoComplete="off"
                    />
                    <datalist id="category-suggestions">
                      {categoryOptions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div>
                    <label
                      htmlFor="expense-amount"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Importe (€)
                    </label>
                    <input
                      id="expense-amount"
                      type="text"
                      inputMode="decimal"
                      value={amountEuros}
                      onChange={(e) => setAmountEuros(e.target.value)}
                      className={inputClass}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="expense-recurrence"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Periodicidad del cargo
                    </label>
                    <select
                      id="expense-recurrence"
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                      className={inputClass}
                    >
                      {RECURRENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="expense-notes"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Notas{" "}
                    <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <textarea
                    id="expense-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-y`}
                    placeholder="Factura, trimestre…"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Registrar gasto"}
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
