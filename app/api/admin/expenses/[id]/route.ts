import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { expenseRecurringGroupKey } from "@/lib/dashboard/expenseCanonical";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RECURRENCE = [
  "none",
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;
type Recurrence = (typeof RECURRENCE)[number];

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function isRecurrence(v: string): v is Recurrence {
  return (RECURRENCE as readonly string[]).includes(v);
}

type ExpenseRow = {
  id: string;
  concept: string;
  category: string;
  recurrence: string;
  expense_date: string;
  amount_cents: number;
  notes: string | null;
  deductibility: string;
  deductible_percent: number;
  structure_mode: string | null;
};

type PatchBody = {
  concept?: string;
  expenseDate?: string;
  category?: string;
  recurrence?: string;
  amountEuros?: number;
  notes?: string | null;
  deductibility?: "full" | "partial" | "none";
  deductiblePercent?: number;
  structureMode?: "strict" | "variable" | null;
  /**
   * Solo cargos recurrentes: actualiza todas las filas del mismo cargo (mismo concepto canónico,
   * categoría y periodicidad) con expense_date >= esta fecha. Las anteriores conservan importe y datos.
   */
  effectiveFrom?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as PatchBody;
    const supabase = createSupabaseAdminClient();

    const { data: currentRows, error: fetchErr } = await supabase
      .from("expenses")
      .select(
        "id, concept, category, recurrence, expense_date, amount_cents, notes, deductibility, deductible_percent, structure_mode",
      )
      .eq("id", id)
      .limit(1);

    if (fetchErr || !currentRows?.length) {
      return NextResponse.json({ ok: false, message: "Gasto no encontrado" }, { status: 404 });
    }

    const current = currentRows[0] as ExpenseRow;

    const updates: Record<string, unknown> = {};

    if (body.concept !== undefined) {
      const concept = String(body.concept).trim();
      if (!concept || concept.length < 2) {
        return NextResponse.json(
          { ok: false, message: "El concepto es obligatorio (mín. 2 caracteres)" },
          { status: 400 },
        );
      }
      updates.concept = concept;
    }

    if (body.expenseDate !== undefined) {
      const raw = String(body.expenseDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return NextResponse.json(
          { ok: false, message: "Fecha no válida (usa AAAA-MM-DD)" },
          { status: 400 },
        );
      }
      updates.expense_date = raw;
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category || category.length > 120) {
        return NextResponse.json(
          { ok: false, message: "Indica una categoría (máx. 120 caracteres)" },
          { status: 400 },
        );
      }
      updates.category = category;
    }

    if (body.recurrence !== undefined) {
      const recurrence = String(body.recurrence);
      if (!isRecurrence(recurrence)) {
        return NextResponse.json({ ok: false, message: "Periodicidad no válida" }, { status: 400 });
      }
      updates.recurrence = recurrence;
    }

    if (body.amountEuros !== undefined) {
      const amountEuros = Number(body.amountEuros);
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
      updates.amount_cents = amountCents;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes === null || body.notes === "" ? null : String(body.notes).trim();
    }

    if (body.deductibility !== undefined) {
      const d = body.deductibility;
      if (d !== "full" && d !== "partial" && d !== "none") {
        return NextResponse.json({ ok: false, message: "Deducibilidad no válida" }, { status: 400 });
      }
      updates.deductibility = d;
    }

    if (body.deductiblePercent !== undefined) {
      let p = Math.round(Number(body.deductiblePercent));
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return NextResponse.json({ ok: false, message: "Porcentaje deducible inválido" }, { status: 400 });
      }
      updates.deductible_percent = p;
    }

    if (body.structureMode !== undefined) {
      const sm = body.structureMode;
      if (sm !== null && sm !== "strict" && sm !== "variable") {
        return NextResponse.json({ ok: false, message: "Modo de estructura no válido" }, { status: 400 });
      }
      updates.structure_mode = sm;
    }

    const targetRecurrence = (updates.recurrence as string | undefined) ?? current.recurrence;

    if (targetRecurrence === "none" && current.recurrence !== "none") {
      updates.structure_mode = null;
    } else if (targetRecurrence !== "none") {
      const finalStructure =
        updates.structure_mode !== undefined
          ? (updates.structure_mode as string | null)
          : current.structure_mode;
      if (finalStructure !== "strict" && finalStructure !== "variable") {
        return NextResponse.json(
          { ok: false, message: "Los cargos recurrentes requieren modo predecible o variable (estructura)" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, message: "No hay cambios que guardar" },
        { status: 400 },
      );
    }

    const effRaw = body.effectiveFrom?.trim();
    const effectiveFrom =
      effRaw && /^\d{4}-\d{2}-\d{2}$/.test(effRaw) ? effRaw : undefined;

    const useBulk =
      current.recurrence !== "none" &&
      effectiveFrom !== undefined &&
      Object.keys(updates).length > 0;

    if (useBulk) {
      const groupKey = expenseRecurringGroupKey(current);
      const { data: candidates, error: candErr } = await supabase
        .from("expenses")
        .select("id, concept, category, expense_date, recurrence")
        .eq("recurrence", current.recurrence);

      if (candErr || !candidates) {
        return NextResponse.json(
          { ok: false, message: "No se pudieron buscar cargos relacionados" },
          { status: 500 },
        );
      }

      const ids = (candidates as { id: string; concept: string; category: string; expense_date: string; recurrence: string }[])
        .filter((r) => expenseRecurringGroupKey(r) === groupKey && r.expense_date >= effectiveFrom!)
        .map((r) => r.id);

      if (ids.length === 0) {
        return NextResponse.json(
          { ok: false, message: "No hay apuntes en el rango indicado para este cargo" },
          { status: 400 },
        );
      }

      const { error: upErr } = await supabase.from("expenses").update(updates).in("id", ids);
      if (upErr) {
        return NextResponse.json(
          { ok: false, message: "No se pudo actualizar los gastos" },
          { status: 500 },
        );
      }
    } else {
      const { data, error } = await supabase.from("expenses").update(updates).eq("id", id).select("id").limit(1);

      if (error) {
        return NextResponse.json(
          { ok: false, message: "No se pudo actualizar el gasto" },
          { status: 500 },
        );
      }
      if (!data?.length) {
        return NextResponse.json({ ok: false, message: "Gasto no encontrado" }, { status: 404 });
      }
    }

    revalidatePath("/dashboard/gastos");
    revalidatePath("/dashboard");

    return NextResponse.json({ ok: true, updatedBulk: useBulk });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("expenses").delete().eq("id", id).select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "No se pudo eliminar el gasto" },
      { status: 500 },
    );
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, message: "Gasto no encontrado" }, { status: 404 });
  }

  revalidatePath("/dashboard/gastos");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
