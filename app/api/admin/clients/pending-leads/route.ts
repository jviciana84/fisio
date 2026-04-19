import { NextResponse } from "next/server";
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

/**
 * Leads web (intento de compra de bono con pago no habilitado): estado_pago = pendiente_contacto
 * y aún sin marcar como contactados.
 */
export async function GET() {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, notes, created_at")
    .eq("is_active", true)
    .eq("estado_pago", "pendiente_contacto")
    .is("lead_contacted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const msg = error.message ?? "";
    if (error.code === "42703" || msg.includes("lead_contacted_at")) {
      const fallback = await supabase
        .from("clients")
        .select("id, full_name, email, phone, notes, created_at")
        .eq("is_active", true)
        .eq("estado_pago", "pendiente_contacto")
        .order("created_at", { ascending: false })
        .limit(500);
      if (fallback.error) {
        return NextResponse.json(
          { ok: false, message: "No se pudieron cargar los leads" },
          { status: 500 },
        );
      }
      const leads = ((fallback.data ?? []) as Row[]).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        notes: r.notes,
        createdAt: r.created_at,
      }));
      return NextResponse.json({ ok: true, leads, columnMissing: true });
    }
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los leads" },
      { status: 500 },
    );
  }

  const leads = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ ok: true, leads });
}
