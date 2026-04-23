import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentMethod = "cash" | "bizum" | "card";

type PatchBody = {
  paymentMethod?: PaymentMethod;
  totalEuros?: number;
  notes?: string | null;
};

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function isPaymentMethod(v: string): v is PaymentMethod {
  return v === "cash" || v === "bizum" || v === "card";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as PatchBody;
    const hasPayment = body.paymentMethod !== undefined;
    const hasTotal = body.totalEuros !== undefined;
    const hasNotes = body.notes !== undefined;

    if (!hasPayment && !hasTotal && !hasNotes) {
      return NextResponse.json({ ok: false, message: "No hay cambios que guardar" }, { status: 400 });
    }
    if (hasPayment && !isPaymentMethod(body.paymentMethod!)) {
      return NextResponse.json({ ok: false, message: "Forma de pago no válida" }, { status: 400 });
    }

    const changes: {
      payment_method?: PaymentMethod;
      subtotal_cents?: number;
      total_cents?: number;
      notes?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (hasPayment) changes.payment_method = body.paymentMethod;
    if (hasNotes) changes.notes = body.notes?.trim() || null;
    if (hasTotal) {
      const euros = Number(body.totalEuros);
      if (!Number.isFinite(euros) || euros <= 0) {
        return NextResponse.json(
          { ok: false, message: "Indica un importe mayor que cero" },
          { status: 400 },
        );
      }
      const cents = Math.round(euros * 100);
      changes.total_cents = cents;
      changes.subtotal_cents = cents;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("invoices").update(changes).eq("id", id).select("id");
    if (error) {
      return NextResponse.json({ ok: false, message: "No se pudo actualizar la factura" }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, message: "Factura no encontrada" }, { status: 404 });
    }

    revalidatePath("/dashboard/facturas");
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
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("invoices").delete().eq("id", id).select("id");
  if (error) {
    return NextResponse.json({ ok: false, message: "No se pudo eliminar la factura" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, message: "Factura no encontrada" }, { status: 404 });
  }

  revalidatePath("/dashboard/facturas");
  return NextResponse.json({ ok: true });
}
