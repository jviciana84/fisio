import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentMethod = "cash" | "bizum";
type Body = {
  clientId?: string | null;
  productIds: string[];
  manualAmountEuros?: number;
  paymentMethod: PaymentMethod;
};

type ProductDb = {
  id: string;
  name: string;
  price_cents: number;
};

type TicketLineInsert = {
  ticket_id: string;
  product_id: string | null;
  concept: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

function isPaymentMethod(v: string): v is PaymentMethod {
  return v === "cash" || v === "bizum";
}

async function generateTicketNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TK-${y}${m}${day}-${rnd}`;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const paymentMethod = body.paymentMethod;
    const manualAmountEuros = Number(body.manualAmountEuros ?? 0);
    const manualAmountCents = Math.max(0, Math.round(manualAmountEuros * 100));
    const productIds = [...new Set((body.productIds ?? []).filter(Boolean))];

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json({ ok: false, message: "Forma de pago no válida" }, { status: 400 });
    }

    if (!productIds.length && manualAmountCents <= 0) {
      return NextResponse.json(
        { ok: false, message: "Añade al menos un producto o un importe manual" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price_cents")
      .in("id", productIds)
      .eq("is_active", true);

    if (productError) {
      return NextResponse.json(
        { ok: false, message: "No se pudieron validar los productos" },
        { status: 500 },
      );
    }

    const rows = (products ?? []) as ProductDb[];
    const subtotalCents = rows.reduce((sum, p) => sum + p.price_cents, 0);
    const totalCents = subtotalCents + manualAmountCents;

    if (totalCents <= 0) {
      return NextResponse.json({ ok: false, message: "El total debe ser mayor que 0" }, { status: 400 });
    }

    const ticketNumber = await generateTicketNumber();

    const { data: ticket, error: ticketError } = await supabase
      .from("cash_tickets")
      .insert({
        ticket_number: ticketNumber,
        client_id: body.clientId ?? null,
        subtotal_cents: subtotalCents,
        manual_amount_cents: manualAmountCents,
        total_cents: totalCents,
        payment_method: paymentMethod,
        created_by_staff_id: auth.userId,
      })
      .select("id, ticket_number, created_at")
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ ok: false, message: "No se pudo crear el ticket" }, { status: 500 });
    }

    const lineItems: TicketLineInsert[] = rows.map((p) => ({
      ticket_id: ticket.id,
      product_id: p.id,
      concept: p.name,
      unit_price_cents: p.price_cents,
      quantity: 1,
      line_total_cents: p.price_cents,
    }));

    if (manualAmountCents > 0) {
      lineItems.push({
        ticket_id: ticket.id,
        product_id: null,
        concept: "Importe manual",
        unit_price_cents: manualAmountCents,
        quantity: 1,
        line_total_cents: manualAmountCents,
      });
    }

    const { error: linesError } = await supabase.from("cash_ticket_items").insert(lineItems);
    if (linesError) {
      return NextResponse.json(
        { ok: false, message: "Ticket creado, pero falló el detalle de líneas" },
        { status: 500 },
      );
    }

    let clientName: string | null = null;
    if (body.clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("full_name")
        .eq("id", body.clientId)
        .maybeSingle();
      clientName = client?.full_name ?? null;
    }

    return NextResponse.json({
      ok: true,
      receipt: {
        ticketNumber: ticket.ticket_number,
        createdAt: ticket.created_at,
        paymentMethod,
        clientName,
        lines: lineItems.map((l) => ({
          concept: l.concept,
          amountEuros: l.line_total_cents / 100,
        })),
        totalEuros: totalCents / 100,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
