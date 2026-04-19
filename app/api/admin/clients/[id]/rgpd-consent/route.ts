import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function compact(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * Registra el consentimiento informado (RGPD) con fecha/hora de registro en clínica.
 * Body opcional: { "version": "v2025-04" } — versión del texto de privacidad informado.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, message: "Id no válido" }, { status: 400 });
  }

  let version: string | null = null;
  try {
    const body = (await request.json()) as { version?: unknown };
    const v = compact(body?.version);
    if (v) version = v;
  } catch {
    /* body vacío */
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const update: Record<string, string | null> = { rgpd_consent_at: now };
  if (version) update.rgpd_consent_version = version;

  const { data, error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", id)
    .is("rgpd_consent_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    if (error.code === "42703" || msg.toLowerCase().includes("rgpd_consent")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Falta aplicar la migración en Supabase (columnas rgpd_consent_at). Ejecuta las migraciones del proyecto.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message: "No se pudo registrar el consentimiento" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Cliente no encontrado o el consentimiento ya estaba registrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
