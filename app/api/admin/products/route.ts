import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  name: string;
  description?: string;
  /** Precio en euros (ej. 12.50). */
  priceEuros: number;
  /** 4 cifras mostradas al abrir el formulario. */
  productCode?: string;
  productKind?: "service" | "bono";
  bonoSessions?: number | null;
};

function isProductCodeFormat(code: string): boolean {
  return /^\d{4}$/.test(code);
}

async function generateUniqueProductCode(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const n = Math.floor(Math.random() * 10000);
    const code = String(n).padStart(4, "0");
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("product_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  for (let i = 0; i < 10000; i++) {
    const code = String(i).padStart(4, "0");
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("product_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("No hay códigos de producto libres");
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  try {
    const productCode = await generateUniqueProductCode(supabase);
    return NextResponse.json({ productCode });
  } catch {
    return NextResponse.json(
      { message: "No se pudo generar un código de producto" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const priceEuros = Number(body.priceEuros);
    const requestedCode = body.productCode?.trim();
    const productKind = body.productKind === "bono" ? "bono" : "service";
    const bonoSessionsRaw = body.bonoSessions;

    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, message: "El nombre del producto es obligatorio" },
        { status: 400 },
      );
    }

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

    let bonoSessions: number | null = null;
    if (productKind === "bono") {
      const parsed = Math.round(Number(bonoSessionsRaw));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { ok: false, message: "Para productos bono, indica sesiones > 0." },
          { status: 400 },
        );
      }
      bonoSessions = parsed;
    }

    const supabase = createSupabaseAdminClient();

    let productCode: string;
    if (requestedCode) {
      if (!isProductCodeFormat(requestedCode)) {
        return NextResponse.json(
          { ok: false, message: "Código de producto no válido. Recarga la página." },
          { status: 400 },
        );
      }
      const { data: taken } = await supabase
        .from("products")
        .select("id")
        .eq("product_code", requestedCode)
        .maybeSingle();
      if (taken) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Ese código ya está en uso. Recarga el formulario para obtener otro.",
          },
          { status: 409 },
        );
      }
      productCode = requestedCode;
    } else {
      productCode = await generateUniqueProductCode(supabase);
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        description,
        product_code: productCode,
        price_cents: priceCents,
        product_kind: productKind,
        bono_sessions: bonoSessions,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un producto con ese código" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, message: "No se pudo crear el producto" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      productCode,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
