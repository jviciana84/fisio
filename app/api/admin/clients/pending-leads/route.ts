import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type RowWide = Row & {
  estado_pago?: string | null;
  lead_contacted_at?: string | null;
  is_active?: boolean | null;
};

function mapLead(r: Row) {
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

/** Coincide con la semántica de pendiente de llamada cuando filtramos en memoria. */
function isPendingLeadRow(r: RowWide): boolean {
  if (r.estado_pago !== "pendiente_contacto") return false;
  const lead = r.lead_contacted_at;
  if (lead != null && String(lead).trim() !== "") return false;
  if (r.is_active === false) return false;
  return true;
}

function logPendingLeadsErrors(label: string, err: PostgrestError | null) {
  if (err) console.error(`[pending-leads] ${label}`, err.code, err.message, err.details);
}

/**
 * Leads web (intento de compra de bono con pago no habilitado): estado_pago = pendiente_contacto
 * y aún sin marcar como contactados.
 *
 * Varias consultas encadenadas: un `42703` por columna ausente en el filtro principal
 * no debe tumbar el endpoint (antes el fallback seguía usando `estado_pago` y devolvía 500).
 */
export async function GET() {
  try {
    const auth = await requireStaffOrAdminApi();
    if (auth instanceof NextResponse) return auth;

    const supabase = createSupabaseAdminClient();
    const baseCols = "id, full_name, email, phone, notes, created_at";

    const q1 = await supabase
      .from("clients")
      .select(baseCols)
      .eq("is_active", true)
      .eq("estado_pago", "pendiente_contacto")
      .is("lead_contacted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!q1.error) {
      return NextResponse.json({ ok: true, leads: ((q1.data ?? []) as Row[]).map(mapLead) });
    }
    logPendingLeadsErrors("q1", q1.error);

    const q2 = await supabase
      .from("clients")
      .select(baseCols)
      .eq("is_active", true)
      .eq("estado_pago", "pendiente_contacto")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!q2.error) {
      return NextResponse.json({
        ok: true,
        leads: ((q2.data ?? []) as Row[]).map(mapLead),
        columnMissing: true,
      });
    }
    logPendingLeadsErrors("q2", q2.error);

    const wideSelects = [
      `${baseCols}, estado_pago, lead_contacted_at, is_active`,
      `${baseCols}, estado_pago, lead_contacted_at`,
      `${baseCols}, estado_pago, is_active`,
      `${baseCols}, estado_pago`,
      baseCols,
    ] as const;

    for (const sel of wideSelects) {
      const r = await supabase.from("clients").select(sel).order("created_at", { ascending: false }).limit(1000);
      if (r.error) {
        logPendingLeadsErrors(`wide:${sel.slice(0, 40)}…`, r.error);
        continue;
      }
      const rows = ((r.data ?? []) as unknown) as RowWide[];
      const leads = rows.filter(isPendingLeadRow).slice(0, 500).map((row) => mapLead(row));
      return NextResponse.json({ ok: true, leads, columnMissing: true });
    }

    const qLast = await supabase.from("clients").select(baseCols).order("created_at", { ascending: false }).limit(1);
    if (!qLast.error) {
      return NextResponse.json({
        ok: true,
        leads: [],
        columnMissing: true,
        schemaIncomplete: true,
      });
    }
    logPendingLeadsErrors("qLast", qLast.error);

    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los leads" },
      { status: 500 },
    );
  } catch (e) {
    console.error("[pending-leads] unhandled", e);
    return NextResponse.json({ ok: false, message: "Error interno al cargar leads" }, { status: 500 });
  }
}
