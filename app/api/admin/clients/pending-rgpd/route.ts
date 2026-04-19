import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

/**
 * Clientes activos sin fecha de registro de consentimiento informado (RGPD).
 */
export async function GET() {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, created_at")
    .eq("is_active", true)
    .is("rgpd_consent_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const msg = error.message ?? "";
    if (error.code === "42703" || msg.toLowerCase().includes("rgpd_consent")) {
      return NextResponse.json({ ok: true, pending: [], columnMissing: true });
    }
    console.error("[pending-rgpd]", error);
    return NextResponse.json({ ok: false, message: "No se pudieron cargar los pendientes RGPD" }, { status: 500 });
  }

  const pending = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ ok: true, pending });
}
