import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeCategory(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

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
  const categoryStats = unique.map((name) => ({
    name,
    count: rows.filter((r) => (r.category ?? "").trim() === name.trim()).length,
  }));

  return NextResponse.json({ ok: true, categories: unique, categoryStats });
}

type PatchBody = {
  sourceCategories?: string[];
  targetCategory?: string;
};

/** Unifica categorías duplicadas (misma o distinta grafía) a una sola categoría destino. */
export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as PatchBody;
    const sourceCategories = Array.isArray(body.sourceCategories)
      ? body.sourceCategories.map((v) => String(v ?? "").trim()).filter(Boolean)
      : [];
    const targetCategory = String(body.targetCategory ?? "").trim().replace(/\s+/g, " ");

    if (!targetCategory) {
      return NextResponse.json({ ok: false, message: "Indica la categoría destino." }, { status: 400 });
    }
    if (!sourceCategories.length) {
      return NextResponse.json({ ok: false, message: "Selecciona al menos una categoría origen." }, { status: 400 });
    }

    const sourceNormalized = new Set(sourceCategories.map(normalizeCategory));
    const targetNormalized = normalizeCategory(targetCategory);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("expenses").select("id, category");
    if (error) {
      return NextResponse.json({ ok: false, message: "No se pudieron leer los gastos" }, { status: 500 });
    }

    const idsToUpdate = (data ?? [])
      .filter((row) => {
        const current = String(row.category ?? "").trim();
        if (!current) return false;
        const currentNormalized = normalizeCategory(current);
        if (!sourceNormalized.has(currentNormalized)) return false;
        return current !== targetCategory || currentNormalized !== targetNormalized;
      })
      .map((row) => row.id as string);

    if (!idsToUpdate.length) {
      return NextResponse.json({ ok: true, updatedCount: 0, message: "No había cambios pendientes." });
    }

    const { error: updateErr } = await supabase
      .from("expenses")
      .update({ category: targetCategory })
      .in("id", idsToUpdate);

    if (updateErr) {
      return NextResponse.json({ ok: false, message: "No se pudieron unificar categorías." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updatedCount: idsToUpdate.length });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }
}
