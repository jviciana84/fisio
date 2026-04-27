import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { normalizeExpenseVatRatePercent } from "@/lib/dashboard/expenseVat";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RECURRENCE = [
  "none",
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;
type Recurrence = (typeof RECURRENCE)[number];

type Body = {
  concept: string;
  notes?: string;
  /** Categoría libre (ej. Alquiler, Luz). */
  category: string;
  amountEuros: number;
  /** Si no se envía, se usa la fecha del servidor (hoy). */
  expenseDate?: string;
  recurrence: Recurrence;
  deductibility?: "full" | "partial" | "none";
  deductiblePercent?: number;
  /** Obligatorio si recurrence !== none: strict = predecible, variable = margen 10 % en estructura. */
  structureMode?: "strict" | "variable" | null;
  /** Tipo de IVA del importe TTC: 0, 4, 10 o 21. */
  vatRatePercent?: number;
};

function isRecurrence(v: string): v is Recurrence {
  return (RECURRENCE as readonly string[]).includes(v);
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const concept = body.concept?.trim();
    const notes = body.notes?.trim() || null;
    const category = body.category?.trim();
    const amountEuros = Number(body.amountEuros);
    const recurrence = body.recurrence;

    if (!concept || concept.length < 2) {
      return NextResponse.json(
        { ok: false, message: "El concepto es obligatorio" },
        { status: 400 },
      );
    }

    if (!category || category.length < 1 || category.length > 120) {
      return NextResponse.json(
        { ok: false, message: "Indica una categoría (o escribe una nueva)" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      return NextResponse.json(
        { ok: false, message: "Indica un importe mayor que cero" },
        { status: 400 },
      );
    }

    const amountCents = Math.round(amountEuros * 100);
    if (amountCents < 1 || amountCents > 999999999) {
      return NextResponse.json({ ok: false, message: "Importe fuera de rango" }, { status: 400 });
    }

    const rawDate = body.expenseDate?.trim();
    const expenseDate =
      rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : new Date().toISOString().slice(0, 10);

    if (!recurrence || !isRecurrence(recurrence)) {
      return NextResponse.json({ ok: false, message: "Recurrencia no válida" }, { status: 400 });
    }

    let structureMode: "strict" | "variable" | null =
      body.structureMode === "strict" || body.structureMode === "variable" ? body.structureMode : null;
    if (recurrence !== "none") {
      if (structureMode !== "strict" && structureMode !== "variable") {
        return NextResponse.json(
          { ok: false, message: "Indique si el cargo recurrente es predecible o variable (estructura)" },
          { status: 400 },
        );
      }
    } else {
      structureMode = null;
    }

    const deductibility = body.deductibility ?? "full";
    if (deductibility !== "full" && deductibility !== "partial" && deductibility !== "none") {
      return NextResponse.json({ ok: false, message: "Deducibilidad no válida" }, { status: 400 });
    }

    let deductiblePercent = Math.round(Number(body.deductiblePercent ?? 100));
    if (!Number.isFinite(deductiblePercent) || deductiblePercent < 0 || deductiblePercent > 100) {
      return NextResponse.json({ ok: false, message: "Porcentaje deducible inválido" }, { status: 400 });
    }
    if (deductibility !== "partial") {
      deductiblePercent = deductibility === "full" ? 100 : 0;
    }

    const vatRatePercent = normalizeExpenseVatRatePercent(body.vatRatePercent ?? 21);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        concept,
        notes,
        category,
        amount_cents: amountCents,
        expense_date: expenseDate,
        recurrence,
        deductibility,
        deductible_percent: deductiblePercent,
        structure_mode: structureMode,
        vat_rate_percent: vatRatePercent,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, message: "No se pudo registrar el gasto" },
        { status: 500 },
      );
    }

    revalidatePath("/dashboard/gastos");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      id: data.id,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
