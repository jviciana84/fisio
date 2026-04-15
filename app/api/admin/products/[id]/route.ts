import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PatchBody = {
  priceEuros?: number;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  try {
    const body = (await request.json()) as PatchBody;
    const priceEuros = Number(body.priceEuros);
    if (!Number.isFinite(priceEuros) || priceEuros < 0) {
      return NextResponse.json(
        { ok: false, message: "Indica un precio válido (0 o más)" },
        { status: 400 },
      );
    }
    const priceCents = Math.round(priceEuros * 100);

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("products")
      .update({ price_cents: priceCents })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, message: "No se pudo actualizar el precio" },
        { status: 500 },
      );
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

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudo eliminar el producto" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
