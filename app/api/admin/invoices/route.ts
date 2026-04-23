import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentMethod = "cash" | "bizum" | "card";

type CreateBody = {
  ticketId?: string;
};

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function isPaymentMethod(v: string): v is PaymentMethod {
  return v === "cash" || v === "bizum" || v === "card";
}

async function generateInvoiceNumber(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .ilike("invoice_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prev = data?.invoice_number ?? "";
  const seq = Number(prev.split("-").pop() ?? "0");
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      ticket_id,
      issue_date,
      payment_method,
      subtotal_cents,
      total_cents,
      notes,
      created_at,
      clients ( full_name )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar las facturas" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoices: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as CreateBody;
    const ticketId = body.ticketId?.trim() ?? "";
    if (!ticketId || !isUuid(ticketId)) {
      return NextResponse.json({ ok: false, message: "Ticket no válido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("ticket_id", ticketId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, message: `Este ticket ya tiene factura (${existing.invoice_number})` },
        { status: 409 },
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("cash_tickets")
      .select("id, client_id, payment_method, subtotal_cents, total_cents")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketError || !ticket) {
      return NextResponse.json({ ok: false, message: "Ticket no encontrado" }, { status: 404 });
    }
    if (!isPaymentMethod(ticket.payment_method)) {
      return NextResponse.json({ ok: false, message: "Método de pago del ticket no válido" }, { status: 400 });
    }

    const { data: ticketItems, error: itemsError } = await supabase
      .from("cash_ticket_items")
      .select("id, concept, quantity, unit_price_cents, line_total_cents")
      .eq("ticket_id", ticketId);
    if (itemsError) {
      return NextResponse.json({ ok: false, message: "No se pudieron leer líneas del ticket" }, { status: 500 });
    }
    if (!ticketItems?.length) {
      return NextResponse.json({ ok: false, message: "El ticket no tiene líneas" }, { status: 400 });
    }

    const invoiceNumber = await generateInvoiceNumber(supabase);
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        ticket_id: ticket.id,
        client_id: ticket.client_id,
        issue_date: new Date().toISOString().slice(0, 10),
        payment_method: ticket.payment_method,
        subtotal_cents: ticket.subtotal_cents,
        total_cents: ticket.total_cents,
        created_by_staff_id: auth.userId,
      })
      .select("id")
      .single();
    if (invoiceError || !invoice) {
      return NextResponse.json({ ok: false, message: "No se pudo crear la factura" }, { status: 500 });
    }

    const invoiceItems = ticketItems.map((it) => ({
      invoice_id: invoice.id,
      ticket_item_id: it.id,
      concept: it.concept,
      quantity: it.quantity,
      unit_price_cents: it.unit_price_cents,
      line_total_cents: it.line_total_cents,
    }));
    const { error: invoiceItemsError } = await supabase.from("invoice_items").insert(invoiceItems);
    if (invoiceItemsError) {
      return NextResponse.json(
        { ok: false, message: "Factura creada, pero falló el detalle de líneas" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "Factura generada correctamente" });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
