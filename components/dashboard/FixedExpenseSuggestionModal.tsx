"use client";

import { ArrowLeft, Check, HelpCircle, Pencil, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ExpenseDetailRow } from "@/lib/dashboard/expenseTypes";
import {
  FIXED_EXPENSE_SUGGESTIONS,
  type FixedExpenseSuggestion,
  matchFixedSuggestion,
} from "@/lib/dashboard/fixedExpenseSuggestions";
import { canonicalConceptForFixedKey } from "@/lib/dashboard/expenseCanonical";
import { DASHBOARD_INPUT_CLASS } from "@/components/dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import { formatEurosFieldFromNumber, parseSpanishDecimalInput } from "@/lib/format-es";

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Sin periodicidad (puntual)" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "bimonthly", label: "Bimensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

function firstDayOfMonthIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Phase = "list" | "form";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenses: ExpenseDetailRow[];
};

const inputCls = DASHBOARD_INPUT_CLASS;

const labelFormCls = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500";

/** Solo icono dentro del círculo (lista de sugerencias), filas bajas */
const btnIconEditCls =
  "inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-indigo-500 bg-gradient-to-b from-indigo-50 to-indigo-100/90 text-indigo-900 shadow-sm transition hover:border-indigo-600 hover:from-indigo-100 hover:to-indigo-50 hover:shadow active:scale-[0.98]";

const btnIconRegisterCls =
  "inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rose-500 bg-gradient-to-b from-rose-50 to-orange-50/90 text-rose-900 shadow-sm transition hover:border-rose-600 hover:from-rose-100 hover:to-rose-50 hover:shadow active:scale-[0.98]";

export function FixedExpenseSuggestionModal({ open, onClose, onSuccess, expenses }: Props) {
  const [phase, setPhase] = useState<Phase>("list");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [prefillSuggestion, setPrefillSuggestion] = useState<FixedExpenseSuggestion | null>(null);

  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [deductibility, setDeductibility] = useState<"full" | "partial" | "none">("full");
  const [deductiblePercent, setDeductiblePercent] = useState(100);
  const [structureMode, setStructureMode] = useState<"strict" | "variable">("strict");
  const [expenseDate, setExpenseDate] = useState(todayIso);
  const [effectiveFrom, setEffectiveFrom] = useState(firstDayOfMonthIso);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const predictableSuggestions = useMemo(
    () =>
      FIXED_EXPENSE_SUGGESTIONS.filter((s) => s.kind === "predictable").map((s) => ({
        suggestion: s,
        covered: matchFixedSuggestion(expenses, s, canonicalConceptForFixedKey),
      })),
    [expenses],
  );
  const variableSuggestions = useMemo(
    () =>
      FIXED_EXPENSE_SUGGESTIONS.filter((s) => s.kind === "variable").map((s) => ({
        suggestion: s,
        covered: matchFixedSuggestion(expenses, s, canonicalConceptForFixedKey),
      })),
    [expenses],
  );

  const rowBySuggestionId = useMemo(() => {
    const map: Record<string, ExpenseDetailRow> = {};
    for (const s of FIXED_EXPENSE_SUGGESTIONS) {
      const row = expenses.find(
        (r) => r.recurrence !== "none" && matchFixedSuggestion([r], s, canonicalConceptForFixedKey),
      );
      if (row) map[s.id] = row;
    }
    return map;
  }, [expenses]);

  const resetForm = useCallback(() => {
    setConcept("");
    setCategory("");
    setAmountStr("");
    setRecurrence("monthly");
    setDeductibility("full");
    setDeductiblePercent(100);
    setStructureMode("strict");
    setExpenseDate(todayIso());
    setEffectiveFrom(firstDayOfMonthIso());
    setNotes("");
    setFormError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase("list");
      setEditRowId(null);
      setPrefillSuggestion(null);
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const amountNum = useMemo(() => {
    const n = parseSpanishDecimalInput(amountStr);
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const formValid = useMemo(() => {
    if (!concept.trim() || concept.trim().length < 2) return false;
    if (!category.trim()) return false;
    if (!Number.isFinite(amountNum) || amountNum <= 0) return false;
    if (recurrence !== "none" && structureMode !== "strict" && structureMode !== "variable") return false;
    if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return false;
    if (formMode === "edit" && recurrence !== "none") {
      if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return false;
    }
    return true;
  }, [concept, category, amountNum, recurrence, structureMode, expenseDate, formMode, effectiveFrom]);

  function openCreate(s: FixedExpenseSuggestion) {
    setFormMode("create");
    setEditRowId(null);
    setPrefillSuggestion(s);
    resetForm();
    setConcept(s.label);
    let cat = "General";
    if (s.kind === "predictable") {
      if (/alquiler|arrend/i.test(s.label)) cat = "Alquiler";
      else if (/ibi|tasa|basura|municipal/i.test(s.label)) cat = "Impuestos";
      else cat = "Servicios";
      setStructureMode("strict");
    } else {
      cat = "Suministros";
      setStructureMode("variable");
    }
    setCategory(cat);
    setPhase("form");
  }

  function openEdit(s: FixedExpenseSuggestion) {
    const row = rowBySuggestionId[s.id];
    if (!row) return;
    setFormMode("edit");
    setEditRowId(row.id);
    setPrefillSuggestion(s);
    setConcept(canonicalConceptForFixedKey(row.concept));
    setCategory(row.category?.trim() || "");
    setAmountStr(formatEurosFieldFromNumber(row.amount_cents / 100));
    setRecurrence(row.recurrence || "monthly");
    setDeductibility((row.deductibility as "full" | "partial" | "none") || "full");
    setDeductiblePercent(row.deductible_percent ?? 100);
    setStructureMode(
      row.structure_mode === "variable"
        ? "variable"
        : row.structure_mode === "strict"
          ? "strict"
          : s.kind === "variable"
            ? "variable"
            : "strict",
    );
    setExpenseDate(row.expense_date?.slice(0, 10) || todayIso());
    setEffectiveFrom(firstDayOfMonthIso());
    setNotes(row.notes ?? "");
    setFormError(null);
    setPhase("form");
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (formMode === "create") {
        const res = await fetch("/api/admin/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: concept.trim(),
            notes: notes.trim() || undefined,
            category: category.trim(),
            amountEuros: amountNum,
            expenseDate,
            recurrence,
            deductibility,
            deductiblePercent: deductibility === "partial" ? deductiblePercent : undefined,
            structureMode: recurrence === "none" ? null : structureMode,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setFormError(data.message ?? "No se pudo registrar");
          return;
        }
        onSuccess();
        onClose();
        return;
      }

      if (!editRowId) return;
      const body: Record<string, unknown> = {
        concept: concept.trim(),
        category: category.trim(),
        recurrence,
        amountEuros: amountNum,
        notes: notes.trim() || null,
        deductibility,
        deductiblePercent: deductibility === "partial" ? deductiblePercent : undefined,
        structureMode: recurrence === "none" ? null : structureMode,
      };
      if (recurrence !== "none") {
        body.effectiveFrom = effectiveFrom;
      }
      const res = await fetch(`/api/admin/expenses/${editRowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setFormError(data.message ?? "No se pudo guardar");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setFormError("Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  const dateFieldCreate = (
    <div>
      <label className={labelFormCls}>Fecha</label>
      <input
        type="date"
        value={expenseDate}
        onChange={(e) => setExpenseDate(e.target.value)}
        className={inputCls}
        required
      />
    </div>
  );

  const dateFieldEditRecurrent = (
    <div>
      <label className={labelFormCls}>Vigente desde</label>
      <input
        type="date"
        value={effectiveFrom}
        onChange={(e) => setEffectiveFrom(e.target.value)}
        className={inputCls}
        required
      />
      <p className="mt-0 text-[9px] leading-tight text-slate-500">No altera meses anteriores.</p>
    </div>
  );

  const ivaField = (
    <div>
      <label className={labelFormCls}>IVA deducible</label>
      <select
        value={deductibility}
        onChange={(e) => setDeductibility(e.target.value as "full" | "partial" | "none")}
        className={inputCls}
        required
      >
        <option value="full">100&nbsp;%</option>
        <option value="partial">Parcial</option>
        <option value="none">No deducible</option>
      </select>
    </div>
  );

  const tipoField = (
    <div>
      <label className={labelFormCls}>Tipo de coste</label>
      <select
        value={structureMode}
        onChange={(e) => setStructureMode(e.target.value as "strict" | "variable")}
        className={inputCls}
        required
      >
        <option value="strict">Predecible</option>
        <option value="variable">Variable</option>
      </select>
    </div>
  );

  const pctField = (
    <div>
      <label className={labelFormCls}>% deducible</label>
      <input
        type="number"
        min={1}
        max={99}
        value={deductiblePercent}
        onChange={(e) => setDeductiblePercent(Number(e.target.value))}
        className={inputCls}
        required
      />
    </div>
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={
        phase === "form"
          ? "fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/55 p-2 backdrop-blur-[2px] sm:p-3"
          : "fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-4"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="fixed-suggestion-modal-title"
      onClick={() => (phase === "list" ? onClose() : undefined)}
    >
      <div
        className={
          phase === "form"
            ? "flex max-h-[min(92vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-200/50 sm:max-w-lg md:max-w-2xl"
            : "flex max-h-[min(90vh,700px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-200/50 xl:max-w-6xl"
        }
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "list" ? (
          <>
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 id="fixed-suggestion-modal-title" className="text-base font-semibold tracking-tight text-slate-900 sm:text-[17px]">
                    Sugerencias de gastos fijos
                  </h3>
                  <p className="mt-0.5 max-w-2xl text-xs leading-snug text-slate-600">
                    Izquierda: costes más estables. Derecha: más fluctuantes. Elija la acción en cada fila.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0"
                  onClick={onClose}
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:divide-x lg:divide-slate-100">
                <div className="min-w-0 lg:pr-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Fijos predecibles</p>
                  <ul className="mt-1 space-y-1">
                    {predictableSuggestions.map(({ suggestion, covered }) => (
                      <li
                        key={suggestion.id}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-gradient-to-r from-emerald-50/40 to-white px-2 py-1 text-[13px] leading-tight text-slate-800 shadow-sm"
                      >
                        {covered ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
                        ) : (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-emerald-300/70 bg-white"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0 flex-1">{suggestion.label}</span>
                        {covered ? (
                          <button
                            type="button"
                            onClick={() => openEdit(suggestion)}
                            className={btnIconEditCls}
                            aria-label={`Editar ${suggestion.label}`}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreate(suggestion)}
                            className={btnIconRegisterCls}
                            aria-label={`Registrar ${suggestion.label}`}
                            title="Registrar"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 lg:pl-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Fijos variables</p>
                  <ul className="mt-1 space-y-1">
                    {variableSuggestions.map(({ suggestion, covered }) => (
                      <li
                        key={suggestion.id}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-200/70 bg-gradient-to-r from-amber-50/50 to-white px-2 py-1 text-[13px] leading-tight text-slate-800 shadow-sm"
                      >
                        {covered ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
                        ) : (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-amber-300/80 bg-white"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0 flex-1">{suggestion.label}</span>
                        {covered ? (
                          <button
                            type="button"
                            onClick={() => openEdit(suggestion)}
                            className={btnIconEditCls}
                            aria-label={`Editar ${suggestion.label}`}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreate(suggestion)}
                            className={btnIconRegisterCls}
                            aria-label={`Registrar ${suggestion.label}`}
                            title="Registrar"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white px-3 py-2 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                    {formMode === "create" ? "Nuevo cargo" : "Editar cargo"}
                  </p>
                  <h3 className="text-sm font-semibold leading-tight tracking-tight text-slate-900 sm:text-[15px]">
                    {formMode === "create" ? "Registrar gasto fijo" : "Modificar datos del cargo"}
                  </h3>
                  {prefillSuggestion ? (
                    <p className="mt-0 truncate text-[11px] text-slate-500">Ref.: {prefillSuggestion.label}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-indigo-200/80 px-2.5 text-xs font-semibold text-indigo-900 hover:border-indigo-300 hover:bg-indigo-50"
                  onClick={() => {
                    setPhase("list");
                    setFormError(null);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-indigo-600" strokeWidth={2.25} aria-hidden />
                  Volver a la lista
                </Button>
              </div>
            </div>

            <form onSubmit={submitForm} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={labelFormCls}>Concepto</label>
                    <input
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      className={inputCls}
                      required
                      minLength={2}
                    />
                  </div>
                  <div>
                    <label className={labelFormCls}>Categoría</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={labelFormCls}>Importe (€)</label>
                    <input
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className={inputCls}
                      inputMode="decimal"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelFormCls}>Periodicidad</label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                      className={inputCls}
                      required
                    >
                      {RECURRENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 3 columnas: fecha | IVA | tipo o % */}
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {formMode === "create" ? (
                    dateFieldCreate
                  ) : recurrence !== "none" ? (
                    dateFieldEditRecurrent
                  ) : (
                    dateFieldCreate
                  )}
                  {ivaField}
                  <div>
                    {recurrence !== "none" ? (
                      tipoField
                    ) : deductibility === "partial" ? (
                      pctField
                    ) : (
                      <div className="flex h-full min-h-[2rem] items-end pb-0.5">
                        <span className="text-[10px] text-slate-400">—</span>
                      </div>
                    )}
                  </div>
                </div>

                {recurrence !== "none" && deductibility === "partial" ? (
                  <div className="mt-2 max-w-[9rem]">{pctField}</div>
                ) : null}

                <div className="mt-2">
                  <label className={labelFormCls}>
                    Notas <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none leading-snug`}
                    placeholder="Factura, referencia…"
                  />
                </div>

                {formError ? (
                  <p className="mt-1.5 text-xs text-rose-700" role="alert">
                    {formError}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-slate-50/40 px-3 py-2 sm:px-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    disabled={!formValid || submitting}
                    className="h-8 text-xs sm:text-sm"
                  >
                    {submitting ? "Guardando…" : formMode === "create" ? "Registrar cargo" : "Guardar cambios"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs sm:text-sm"
                    onClick={() => setPhase("list")}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Botón que abre el modal */
export function FixedExpenseModalTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="mb-0.5 h-10 w-10 shrink-0 rounded-xl border-indigo-200/60 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
      onClick={onClick}
      aria-label="Sugerencias de gastos fijos"
      title="Sugerencias de gastos fijos"
    >
      <HelpCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
    </Button>
  );
}
