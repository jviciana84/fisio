import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PatchBody = {
  name?: string;
  description?: string | null;
  priceEuros?: number;
  productCode?: string;
  productKind?: "service" | "bono";
  bonoSessions?: number | null;
};

function isProductCodeFormat(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  try {
    const body = (await request.json()) as PatchBody;
    const supabase = createSupabaseAdminClient();

    const updates: Record<string, string | number | null> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length < 2) {
        return NextResponse.json(
          { ok: false, message: "El nombre del producto es obligatorio" },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    if (body.description !== undefined) {
      if (body.description === null) {
        updates.description = null;
      } else if (typeof body.description === "string") {
        const d = body.description.trim();
        updates.description = d.length ? d : null;
      } else {
        return NextResponse.json(
          { ok: false, message: "Descripción no válida" },
          { status: 400 },
        );
      }
    }

    if (body.priceEuros !== undefined) {
      const priceEuros = Number(body.priceEuros);
      if (!Number.isFinite(priceEuros) || priceEuros < 0) {
        return NextResponse.json(
          { ok: false, message: "Indica un precio válido (0 o más)" },
          { status: 400 },
        );
      }
      const priceCents = Math.round(priceEuros * 100);
      if (priceCents > 999999999) {
        return NextResponse.json({ ok: false, message: "Precio demasiado alto" }, { status: 400 });
      }
      updates.price_cents = priceCents;
    }

    if (body.productCode !== undefined) {
      const code = body.productCode.trim();
      if (!isProductCodeFormat(code)) {
        return NextResponse.json(
          { ok: false, message: "El código debe tener 4 cifras" },
          { status: 400 },
        );
      }
      const { data: taken } = await supabase
        .from("products")
        .select("id")
        .eq("product_code", code)
        .neq("id", id)
        .maybeSingle();
      if (taken) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un producto con ese código" },
          { status: 409 },
        );
      }
      updates.product_code = code;
    }

    if (body.productKind !== undefined) {
      if (body.productKind !== "service" && body.productKind !== "bono") {
        return NextResponse.json(
          { ok: false, message: "Tipo de producto no válido" },
          { status: 400 },
        );
      }
      updates.product_kind = body.productKind;
      if (body.productKind === "service") {
        updates.bono_sessions = null;
      }
    }

    if (body.bonoSessions !== undefined) {
      if ((updates.product_kind ?? body.productKind) !== "bono") {
        return NextResponse.json(
          { ok: false, message: "Las sesiones solo aplican a productos tipo bono." },
          { status: 400 },
        );
      }
      const parsed = Math.round(Number(body.bonoSessions));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { ok: false, message: "Sesiones del bono no válidas (debe ser > 0)." },
          { status: 400 },
        );
      }
      updates.bono_sessions = parsed;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, message: "No hay cambios que guardar" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("products").update(updates).eq("id", id);

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un producto con ese código" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, message: "No se pudo actualizar el producto" },
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
