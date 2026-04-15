import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Categorías ya usadas en gastos (para datalist); cada alta con categoría nueva la incorpora. */
export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("expenses").select("category");

  if (error) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar las categorías" }, { status: 500 });
  }

  const rows = data ?? [];
  const unique = [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[];
  unique.sort((a, b) => a.localeCompare(b, "es"));

  return NextResponse.json({ ok: true, categories: unique });
}
