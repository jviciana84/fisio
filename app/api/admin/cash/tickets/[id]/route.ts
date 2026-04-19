import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentMethod = "cash" | "bizum" | "card";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function isPaymentMethod(v: string): v is PaymentMethod {
  return v === "cash" || v === "bizum" || v === "card";
}

type PatchBody = {
  paymentMethod?: PaymentMethod;
  /** Nuevo total del ticket (euros); reescala las líneas proporcionalmente. */
  totalEuros?: number;
};

type ItemRow = {
  id: string;
  product_id: string | null;
  quantity: number;
  line_total_cents: number;
  unit_price_cents: number;
};

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

    if (!hasPayment && !hasTotal) {
      return NextResponse.json({ ok: false, message: "No hay cambios que guardar" }, { status: 400 });
    }

    if (hasPayment && !isPaymentMethod(body.paymentMethod!)) {
      return NextResponse.json({ ok: false, message: "Forma de pago no válida" }, { status: 400 });
    }

    let newTotalCents: number | undefined;
    if (hasTotal) {
      const euros = Number(body.totalEuros);
      if (!Number.isFinite(euros) || euros <= 0) {
        return NextResponse.json(
          { ok: false, message: "Indica un importe mayor que cero" },
          { status: 400 },
        );
      }
      newTotalCents = Math.round(euros * 100);
      if (newTotalCents < 1 || newTotalCents > 999999999) {
        return NextResponse.json({ ok: false, message: "Importe fuera de rango" }, { status: 400 });
      }
    }

    const supabase = createSupabaseAdminClient();

    const { data: ticket, error: ticketErr } = await supabase
      .from("cash_tickets")
      .select("id, total_cents")
      .eq("id", id)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return NextResponse.json({ ok: false, message: "Ticket no encontrado" }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("cash_ticket_items")
      .select("id, product_id, quantity, line_total_cents, unit_price_cents")
      .eq("ticket_id", id);

    if (itemsErr) {
      return NextResponse.json({ ok: false, message: "No se pudo leer el ticket" }, { status: 500 });
    }

    const lineRows = (items ?? []) as ItemRow[];
    const oldSum = lineRows.reduce((s, r) => s + r.line_total_cents, 0);

    if (hasTotal && oldSum <= 0) {
      return NextResponse.json(
        { ok: false, message: "El ticket no tiene líneas para reescalar" },
        { status: 400 },
      );
    }

    if (hasTotal && newTotalCents !== undefined) {
      let allocated = 0;
      const scaled = lineRows.map((row, i) => {
        if (i < lineRows.length - 1) {
          const v = Math.round((row.line_total_cents / oldSum) * newTotalCents);
          allocated += v;
          const q = Math.max(1, row.quantity);
          return {
            id: row.id,
            line_total_cents: v,
            unit_price_cents: Math.round(v / q),
          };
        }
        const last = newTotalCents - allocated;
        const q = Math.max(1, row.quantity);
        return {
          id: row.id,
          line_total_cents: last,
          unit_price_cents: Math.round(last / q),
        };
      });

      for (const u of scaled) {
        const { error: upErr } = await supabase
          .from("cash_ticket_items")
          .update({
            line_total_cents: u.line_total_cents,
            unit_price_cents: u.unit_price_cents,
          })
          .eq("id", u.id);
        if (upErr) {
          return NextResponse.json(
            { ok: false, message: "No se pudo actualizar las líneas del ticket" },
            { status: 500 },
          );
        }
      }

      const subtotalCents = lineRows.reduce((s, r, i) => {
        const v = scaled[i].line_total_cents;
        return s + (r.product_id != null ? v : 0);
      }, 0);
      const manualCents = lineRows.reduce((s, r, i) => {
        const v = scaled[i].line_total_cents;
        return s + (r.product_id == null ? v : 0);
      }, 0);

      const { error: headErr } = await supabase
        .from("cash_tickets")
        .update({
          subtotal_cents: subtotalCents,
          manual_amount_cents: manualCents,
          total_cents: newTotalCents,
          ...(hasPayment ? { payment_method: body.paymentMethod } : {}),
        })
        .eq("id", id);

      if (headErr) {
        return NextResponse.json(
          { ok: false, message: "No se pudo actualizar el ticket" },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (hasPayment) {
      const { error: payErr } = await supabase
        .from("cash_tickets")
        .update({ payment_method: body.paymentMethod })
        .eq("id", id);
      if (payErr) {
        return NextResponse.json(
          { ok: false, message: "No se pudo actualizar la forma de pago" },
          { status: 500 },
        );
      }
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
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("cash_tickets").delete().eq("id", id).select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudo eliminar el ticket" },
      { status: 500 },
    );
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, message: "Ticket no encontrado" }, { status: 404 });
  }

  revalidatePath("/dashboard/ingresos");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
