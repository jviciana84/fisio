import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  favorite?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Producto no válido" }, { status: 400 });
  }

  let favorite = false;
  try {
    const body = (await request.json()) as Body;
    favorite = body.favorite === true;
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json({ ok: false, message: "Producto no encontrado" }, { status: 404 });
  }

  if (favorite) {
    const { error: upsertError } = await supabase.from("cash_product_favorites").upsert(
      {
        staff_id: auth.userId,
        product_id: id,
      },
      { onConflict: "staff_id,product_id" },
    );
    if (upsertError) {
      return NextResponse.json({ ok: false, message: "No se pudo guardar favorito" }, { status: 500 });
    }
  } else {
    const { error: deleteError } = await supabase
      .from("cash_product_favorites")
      .delete()
      .eq("staff_id", auth.userId)
      .eq("product_id", id);
    if (deleteError) {
      return NextResponse.json({ ok: false, message: "No se pudo quitar favorito" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, favorite });
}
