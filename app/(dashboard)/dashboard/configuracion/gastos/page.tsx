"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { hintForCategory } from "@/lib/fiscal/expenseHints";

/** Categorías “fijas” (estructura / recurrentes típicas): se eligen en la cara trasera del volteo. */
const FIXED_CATEGORIES = [
  "Alquiler",
  "Luz",
  "Agua",
  "Gas",
  "Internet",
  "Telefonía",
  "Seguros",
  "Impuestos",
  "Cuota autónomo",
] as const;

const VARIABLE_SEEDS = ["Material", "Servicios", "Personal", "General", "Otros"];

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
  const [categoryOptions, setCategoryOptions] = useState<string[]>(VARIABLE_SEEDS);
  const [categoryFlipOpen, setCategoryFlipOpen] = useState(false);
  const [categoryBand, setCategoryBand] = useState<"fixed" | "variable" | null>(null);
  const [variableDraft, setVariableDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [deductibility, setDeductibility] = useState<"full" | "partial" | "none">("full");
  const [deductiblePercent, setDeductiblePercent] = useState(50);

  const categoryHint = useMemo(() => hintForCategory(category), [category]);

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
          deductibility,
          deductiblePercent: deductibility === "partial" ? deductiblePercent : undefined,
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
      setVariableDraft("");
      setCategoryBand(null);
      setCategoryFlipOpen(false);
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
              Elige si la categoría es <strong className="font-medium text-slate-800">fija</strong>{" "}
              (estructura recurrente) o <strong className="font-medium text-slate-800">no fija</strong>{" "}
              (variable). Las fijas se eligen en la tarjeta que voltea; las no fijas, con texto libre o
              sugerencias. Luego completa importe y periodicidad.
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
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Categoría</span>
                    <div className="relative min-h-[11.5rem] [perspective:1200px]">
                      <div
                        className={`relative min-h-[11.5rem] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                          categoryFlipOpen ? "[transform:rotateY(180deg)]" : ""
                        }`}
                      >
                        {/* Cara frontal */}
                        <div className="absolute inset-0 min-h-[11.5rem] [backface-visibility:hidden]">
                          <div className="flex h-full min-h-[11.5rem] flex-col rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
                            {category.trim() ? (
                              <div className="flex flex-1 flex-col justify-center gap-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Categoría seleccionada
                                </p>
                                <p className="text-lg font-semibold text-slate-900">{category}</p>
                                <p className="text-xs text-slate-500">
                                  {categoryBand === "fixed"
                                    ? "Categoría fija"
                                    : categoryBand === "variable"
                                      ? "Categoría no fija"
                                      : ""}
                                </p>
                                <button
                                  type="button"
                                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                                  onClick={() => {
                                    const fixedSet = new Set<string>(FIXED_CATEGORIES);
                                    if (fixedSet.has(category.trim())) {
                                      setCategoryBand("fixed");
                                    } else {
                                      setCategoryBand("variable");
                                      setVariableDraft(category);
                                    }
                                    setCategoryFlipOpen(true);
                                  }}
                                >
                                  Cambiar categoría
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-1 flex-col justify-center gap-3">
                                <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Tipo de categoría
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <button
                                    type="button"
                                    className="rounded-xl border-2 border-blue-200 bg-blue-50/80 px-4 py-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                                    onClick={() => {
                                      setCategoryBand("fixed");
                                      setCategoryFlipOpen(true);
                                    }}
                                  >
                                    <span className="block text-sm font-bold text-blue-900">Fijas</span>
                                    <span className="mt-1 block text-xs leading-snug text-blue-800/90">
                                      Alquiler, suministros, seguros… La tarjeta voltea para elegir.
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-xl border-2 border-amber-200 bg-amber-50/80 px-4 py-4 text-left shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
                                    onClick={() => {
                                      setCategoryBand("variable");
                                      setVariableDraft("");
                                      setCategoryFlipOpen(true);
                                    }}
                                  >
                                    <span className="block text-sm font-bold text-amber-950">No fijas</span>
                                    <span className="mt-1 block text-xs leading-snug text-amber-950/90">
                                      Material, servicios puntuales… Texto libre o sugerencias.
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cara trasera */}
                        <div className="absolute inset-0 min-h-[11.5rem] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="flex h-full min-h-[11.5rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
                            {categoryBand === "fixed" ? (
                              <>
                                <p className="text-sm font-semibold text-slate-900">Elige una categoría fija</p>
                                <div className="mt-3 grid max-h-[7.5rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                                  {FIXED_CATEGORIES.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-800 transition hover:border-blue-400 hover:bg-blue-50"
                                      onClick={() => {
                                        setCategory(c);
                                        setCategoryBand("fixed");
                                        setCategoryFlipOpen(false);
                                      }}
                                    >
                                      {c}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                  onClick={() => {
                                    setCategoryFlipOpen(false);
                                  }}
                                >
                                  Volver
                                </button>
                              </>
                            ) : categoryBand === "variable" ? (
                              <>
                                <p className="text-sm font-semibold text-slate-900">Categoría no fija</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Escribe o elige una sugerencia; luego pulsa Aplicar.
                                </p>
                                <input
                                  id="expense-category-variable"
                                  list="category-suggestions-variable"
                                  value={variableDraft}
                                  onChange={(e) => setVariableDraft(e.target.value)}
                                  className={`${inputClass} mt-3`}
                                  placeholder="Ej. Material sanitario"
                                  autoComplete="off"
                                />
                                <datalist id="category-suggestions-variable">
                                  {categoryOptions.map((s) => (
                                    <option key={s} value={s} />
                                  ))}
                                </datalist>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-40"
                                    disabled={variableDraft.trim().length < 2}
                                    onClick={() => {
                                      const v = variableDraft.trim();
                                      if (v.length < 2) return;
                                      setCategory(v);
                                      setCategoryBand("variable");
                                      setCategoryFlipOpen(false);
                                    }}
                                  >
                                    Aplicar
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                    onClick={() => setCategoryFlipOpen(false)}
                                  >
                                    Volver
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="mt-auto w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600"
                                onClick={() => setCategoryFlipOpen(false)}
                              >
                                Volver
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!category.trim() ? (
                      <p className="mt-2 text-xs text-rose-600">Selecciona un tipo de categoría y complétala.</p>
                    ) : null}
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

                {categoryHint ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-blue-900">{categoryHint.title}</p>
                    <p className="mt-2 leading-relaxed">{categoryHint.explanation}</p>
                    <button
                      type="button"
                      className="mt-3 text-xs font-semibold text-blue-700 underline"
                      onClick={() => {
                        setDeductibility(categoryHint.defaultDeductibility);
                        setDeductiblePercent(categoryHint.defaultDeductiblePercent);
                      }}
                    >
                      Aplicar sugerencia ({categoryHint.defaultDeductibility === "full" ? "100%" : categoryHint.defaultDeductibility === "partial" ? `parcial ${categoryHint.defaultDeductiblePercent}%` : "no deducible"})
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div>
                    <label
                      htmlFor="expense-deduct"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Deducibilidad (simulador)
                    </label>
                    <select
                      id="expense-deduct"
                      value={deductibility}
                      onChange={(e) =>
                        setDeductibility(e.target.value as "full" | "partial" | "none")
                      }
                      className={inputClass}
                    >
                      <option value="full">Deducible (100%)</option>
                      <option value="partial">Parcial</option>
                      <option value="none">No deducible</option>
                    </select>
                  </div>
                  {deductibility === "partial" ? (
                    <div>
                      <label
                        htmlFor="expense-deduct-pct"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        % deducible
                      </label>
                      <input
                        id="expense-deduct-pct"
                        type="number"
                        min={1}
                        max={99}
                        value={deductiblePercent}
                        onChange={(e) => setDeductiblePercent(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                  ) : null}
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
