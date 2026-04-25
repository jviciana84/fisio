"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { hintForCategory } from "@/lib/fiscal/expenseHints";

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
  { value: "bimonthly", label: "Bimensual" },
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

function normalizeCategory(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

type CategoryStat = {
  name: string;
  count: number;
};

export default function AltaGastosPage() {
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(CATEGORY_SEEDS);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [deductibility, setDeductibility] = useState<"full" | "partial" | "none">("full");
  const [deductiblePercent, setDeductiblePercent] = useState(50);
  const [structureMode, setStructureMode] = useState<"strict" | "variable">("strict");
  const [mergeSourceCategory, setMergeSourceCategory] = useState("");
  const [mergeTargetCategory, setMergeTargetCategory] = useState("");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const categoryHint = useMemo(() => hintForCategory(category), [category]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/expense-categories");
      const data = (await res.json()) as {
        ok?: boolean;
        categories?: string[];
        categoryStats?: CategoryStat[];
      };
      if (res.ok && data.ok && Array.isArray(data.categories)) {
        setCategoryOptions(mergeCategoryOptions(CATEGORY_SEEDS, data.categories));
        setCategoryStats(Array.isArray(data.categoryStats) ? data.categoryStats : []);
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

  const duplicatedCategoryGroups = useMemo(() => {
    const grouped = new Map<string, CategoryStat[]>();
    for (const stat of categoryStats) {
      const key = normalizeCategory(stat.name);
      const cur = grouped.get(key) ?? [];
      cur.push(stat);
      grouped.set(key, cur);
    }
    return [...grouped.values()]
      .filter((group) => group.length > 1)
      .sort((a, b) => b.reduce((acc, c) => acc + c.count, 0) - a.reduce((acc, c) => acc + c.count, 0));
  }, [categoryStats]);

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
          structureMode: recurrence === "none" ? null : structureMode,
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

  async function onMergeCategories(e: FormEvent) {
    e.preventDefault();
    const source = mergeSourceCategory.trim();
    const target = mergeTargetCategory.trim().replace(/\s+/g, " ");
    if (!source || !target) {
      setMergeMessage({ type: "err", text: "Selecciona categoría origen y destino." });
      return;
    }

    setMergeLoading(true);
    setMergeMessage(null);
    try {
      const sourceGroup = categoryStats
        .filter((s) => normalizeCategory(s.name) === normalizeCategory(source))
        .map((s) => s.name);
      const sourceCategories = sourceGroup.length ? sourceGroup : [source];
      const res = await fetch("/api/admin/expense-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCategories, targetCategory: target }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; updatedCount?: number };
      if (!res.ok || !data.ok) {
        setMergeMessage({ type: "err", text: data.message ?? "No se pudieron unificar categorías." });
        return;
      }
      setMergeMessage({
        type: "ok",
        text:
          data.updatedCount && data.updatedCount > 0
            ? `Categorías unificadas correctamente (${data.updatedCount} gasto(s) actualizados).`
            : data.message ?? "No había cambios pendientes.",
      });
      setMergeSourceCategory("");
      setMergeTargetCategory("");
      await loadCategories();
    } catch {
      setMergeMessage({ type: "err", text: "Error de red al unificar categorías." });
    } finally {
      setMergeLoading(false);
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
              categoría, importe y periodicidad. Indica si el gasto es deducible para el
              simulador fiscal: te ayudamos con una guía según la categoría.
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
                      IVA deducible
                    </label>
                    <select
                      id="expense-deduct"
                      value={deductibility}
                      onChange={(e) =>
                        setDeductibility(e.target.value as "full" | "partial" | "none")
                      }
                      className={inputClass}
                    >
                      <option value="full">100&nbsp;%</option>
                      <option value="partial">Parcial</option>
                      <option value="none">No deducible</option>
                    </select>
                  </div>
                  {recurrence !== "none" ? (
                    <div>
                      <label
                        htmlFor="expense-structure-mode"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Tipo de coste (recurrente)
                      </label>
                      <select
                        id="expense-structure-mode"
                        value={structureMode}
                        onChange={(e) => setStructureMode(e.target.value as "strict" | "variable")}
                        className={inputClass}
                        required
                      >
                        <option value="strict">Predecible</option>
                        <option value="variable">Variable</option>
                      </select>
                    </div>
                  ) : deductibility === "partial" ? (
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

                {recurrence !== "none" && deductibility === "partial" ? (
                  <div>
                    <label
                      htmlFor="expense-deduct-pct-2"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      % deducible
                    </label>
                    <input
                      id="expense-deduct-pct-2"
                      type="number"
                      min={1}
                      max={99}
                      value={deductiblePercent}
                      onChange={(e) => setDeductiblePercent(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                ) : null}

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

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)]">
              <h3 className="text-base font-semibold text-slate-900">Organizar categorías</h3>
              <p className="mt-1 text-xs text-slate-600">
                Unifica categorías duplicadas para que todos los gastos queden agrupados correctamente.
              </p>

              <form onSubmit={onMergeCategories} className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="merge-source-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Categoría origen
                  </label>
                  <select
                    id="merge-source-category"
                    value={mergeSourceCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMergeSourceCategory(value);
                      if (!mergeTargetCategory) setMergeTargetCategory(value);
                    }}
                    className={inputClass}
                  >
                    <option value="">Selecciona…</option>
                    {categoryStats.map((stat) => (
                      <option key={stat.name} value={stat.name}>
                        {stat.name} ({stat.count})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="merge-target-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Categoría destino
                  </label>
                  <input
                    id="merge-target-category"
                    value={mergeTargetCategory}
                    onChange={(e) => setMergeTargetCategory(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Electricidad"
                    autoComplete="off"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={mergeLoading}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {mergeLoading ? "Unificando…" : "Unificar categorías"}
                  </button>
                </div>
              </form>

              {mergeMessage ? (
                <p
                  className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                    mergeMessage.type === "ok"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {mergeMessage.text}
                </p>
              ) : null}

              {duplicatedCategoryGroups.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Posibles duplicados detectados
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs text-amber-900">
                    {duplicatedCategoryGroups.map((group) => (
                      <p key={group.map((g) => g.name).join("|")}>
                        {group.map((g) => `${g.name} (${g.count})`).join(" · ")}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
