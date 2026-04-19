import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Marca el lead como contactado por teléfono (deja de salir en pendientes).
 */
export async function PATCH(_request: Request, ctx: Ctx) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, message: "Id no válido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("clients")
    .update({ lead_contacted_at: now })
    .eq("id", id)
    .eq("estado_pago", "pendiente_contacto")
    .is("lead_contacted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    if (error.code === "42703" || msg.includes("lead_contacted_at")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Falta aplicar la migración en Supabase (columna lead_contacted_at). Ejecuta las migraciones del proyecto.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message: "No se pudo actualizar el lead" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Lead no encontrado o ya estaba marcado como contactado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
