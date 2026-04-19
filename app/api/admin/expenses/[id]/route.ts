import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
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

type PatchBody = {
  concept?: string;
  /** Fecha del gasto (YYYY-MM-DD). */
  expenseDate?: string;
  category?: string;
  recurrence?: string;
  amountEuros?: number;
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, message: "No hay cambios que guardar" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, message: "No se pudo actualizar el gasto" },
        { status: 500 },
      );
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, message: "Gasto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
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
