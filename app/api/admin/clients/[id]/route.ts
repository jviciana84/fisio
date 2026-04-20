import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function missingColumn(err: PostgrestError | null, name: string): boolean {
  if (!err) return false;
  if (err.code === "42703") return true;
  return (err.message ?? "").toLowerCase().includes(name.toLowerCase());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLIENT_SELECT_VARIANTS = [
  "id, client_code, full_name, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version, bono_remaining_sessions, bono_expires_at",
  "id, client_code, full_name, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
  "id, client_code, full_name, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at",
  "id, client_code, full_name, email, phone, notes, created_at, is_active",
] as const;

type ClientDb = {
  id: string;
  client_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  is_active: boolean | null;
  estado_pago?: string | null;
  lead_contacted_at?: string | null;
  origen_cliente?: string | null;
  rgpd_consent_at?: string | null;
  rgpd_consent_version?: string | null;
  bono_remaining_sessions?: number | null;
  bono_expires_at?: string | null;
};

function mapClient(c: ClientDb) {
  return {
    id: c.id,
    clientCode: c.client_code,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.created_at,
    isActive: c.is_active ?? true,
    estadoPago: c.estado_pago ?? null,
    leadContactedAt: c.lead_contacted_at ?? null,
    origenCliente: c.origen_cliente ?? null,
    rgpdConsentAt: c.rgpd_consent_at ?? null,
    rgpdConsentVersion: c.rgpd_consent_version ?? null,
    bonoRemainingSessions: c.bono_remaining_sessions ?? null,
    bonoExpiresAt: c.bono_expires_at ?? null,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, message: "ID no válido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let client: ClientDb | null = null;
  let lastErr: PostgrestError | null = null;

  for (const sel of CLIENT_SELECT_VARIANTS) {
    const res = await supabase.from("clients").select(sel).eq("id", id).eq("is_active", true).maybeSingle();
    if (!res.error && res.data) {
      client = res.data as unknown as ClientDb;
      break;
    }
    lastErr = res.error;
    if (
      res.error &&
      !missingColumn(res.error, "bono_remaining_sessions") &&
      !missingColumn(res.error, "origen_cliente") &&
      !missingColumn(res.error, "rgpd_consent_at") &&
      !missingColumn(res.error, "lead_contacted_at") &&
      !missingColumn(res.error, "estado_pago") &&
      !missingColumn(res.error, "is_active")
    ) {
      break;
    }
  }

  if (!client) {
    if (lastErr?.code === "PGRST116") {
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });
    }
    console.error("[admin/clients/[id]] GET client", lastErr);
    return NextResponse.json({ ok: false, message: "No se pudo cargar el cliente" }, { status: 500 });
  }

  const { data: ticketRows, error: tErr } = await supabase
    .from("cash_tickets")
    .select("id, ticket_number, subtotal_cents, manual_amount_cents, total_cents, payment_method, created_at, created_by_staff_id")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (tErr) {
    console.error("[admin/clients/[id]] GET tickets", tErr);
    return NextResponse.json(
      { ok: false, message: "Cliente cargado pero no el historial de tickets" },
      { status: 500 },
    );
  }

  const rows = (ticketRows ?? []) as Array<{
    id: string;
    ticket_number: string;
    subtotal_cents: number;
    manual_amount_cents: number;
    total_cents: number;
    payment_method: string;
    created_at: string;
    created_by_staff_id: string | null;
  }>;

  const ticketIds = rows.map((r) => r.id);
  let itemsByTicket: Record<
    string,
    Array<{ id: string; concept: string; quantity: number; unit_price_cents: number; line_total_cents: number }>
  > = {};

  if (ticketIds.length > 0) {
    const { data: itemRows, error: iErr } = await supabase
      .from("cash_ticket_items")
      .select("id, ticket_id, concept, quantity, unit_price_cents, line_total_cents")
      .in("ticket_id", ticketIds);

    if (!iErr && itemRows) {
      for (const it of itemRows as Array<{
        id: string;
        ticket_id: string;
        concept: string;
        quantity: number;
        unit_price_cents: number;
        line_total_cents: number;
      }>) {
        const list = itemsByTicket[it.ticket_id] ?? [];
        list.push({
          id: it.id,
          concept: it.concept,
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          line_total_cents: it.line_total_cents,
        });
        itemsByTicket[it.ticket_id] = list;
      }
    }
  }

  const tickets = rows.map((r) => ({
    id: r.id,
    ticketNumber: r.ticket_number,
    subtotalCents: r.subtotal_cents,
    manualAmountCents: r.manual_amount_cents,
    totalCents: r.total_cents,
    paymentMethod: r.payment_method,
    createdAt: r.created_at,
    createdByStaffId: r.created_by_staff_id,
    items: (itemsByTicket[r.id] ?? []).map((it) => ({
      id: it.id,
      concept: it.concept,
      quantity: it.quantity,
      unitPriceCents: it.unit_price_cents,
      lineTotalCents: it.line_total_cents,
    })),
  }));

  return NextResponse.json({ ok: true, client: mapClient(client), tickets });
}

type PatchBody = {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  estadoPago?: string | null;
  origenCliente?: string | null;
  leadContactedAt?: string | null;
  /** `null` o cadena vacía borra la fecha de contacto lead */
  clearLeadContacted?: boolean;
  bonoRemainingSessions?: number | null;
  bonoExpiresAt?: string | null;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, message: "ID no válido" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  if (fullName !== undefined && fullName.length === 0) {
    return NextResponse.json({ ok: false, message: "El nombre no puede estar vacío" }, { status: 400 });
  }

  const email =
    body.email === undefined
      ? undefined
      : body.email === null || String(body.email).trim() === ""
        ? null
        : String(body.email).trim().toLowerCase();
  const phone =
    body.phone === undefined
      ? undefined
      : body.phone === null || String(body.phone).trim() === ""
        ? null
        : String(body.phone).trim();
  const notes =
    body.notes === undefined
      ? undefined
      : body.notes === null
        ? null
        : String(body.notes);

  let estado_pago: string | undefined;
  if (body.estadoPago !== undefined) {
    const e =
      body.estadoPago === null || body.estadoPago === ""
        ? "pendiente_validacion"
        : String(body.estadoPago).trim().slice(0, 80);
    estado_pago = e.length ? e : "pendiente_validacion";
  }

  let origen_cliente: string | null | undefined;
  if (body.origenCliente !== undefined) {
    if (body.origenCliente === null || body.origenCliente === "") {
      origen_cliente = null;
    } else {
      const o = String(body.origenCliente).trim().toLowerCase();
      if (o === "internet" || o === "fisico") origen_cliente = o;
      else {
        return NextResponse.json({ ok: false, message: "Origen no válido (internet o fisico)" }, { status: 400 });
      }
    }
  }

  let lead_contacted_at: string | null | undefined;
  if (body.clearLeadContacted === true) {
    lead_contacted_at = null;
  } else if (body.leadContactedAt !== undefined) {
    const raw = String(body.leadContactedAt ?? "").trim();
    if (raw === "" || raw === "null") lead_contacted_at = null;
    else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, message: "Fecha de contacto lead no válida" }, { status: 400 });
      }
      lead_contacted_at = d.toISOString();
    }
  }

  let bono_remaining_sessions: number | null | undefined;
  if (body.bonoRemainingSessions !== undefined) {
    if (body.bonoRemainingSessions === null) bono_remaining_sessions = null;
    else {
      const n = Math.round(Number(body.bonoRemainingSessions));
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ ok: false, message: "Sesiones de bono no válidas" }, { status: 400 });
      }
      bono_remaining_sessions = n;
    }
  }

  let bono_expires_at: string | null | undefined;
  if (body.bonoExpiresAt !== undefined) {
    const raw = String(body.bonoExpiresAt ?? "").trim();
    if (raw === "" || raw === "null") bono_expires_at = null;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) bono_expires_at = raw;
    else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, message: "Fecha de caducidad del bono no válida" }, { status: 400 });
      }
      bono_expires_at = d.toISOString().slice(0, 10);
    }
  }

  const patch: Record<string, unknown> = {};
  if (fullName !== undefined) patch.full_name = fullName;
  if (email !== undefined) patch.email = email;
  if (phone !== undefined) patch.phone = phone;
  if (notes !== undefined) patch.notes = notes;
  if (estado_pago !== undefined) patch.estado_pago = estado_pago;
  if (origen_cliente !== undefined) patch.origen_cliente = origen_cliente;
  if (lead_contacted_at !== undefined) patch.lead_contacted_at = lead_contacted_at;
  if (bono_remaining_sessions !== undefined) patch.bono_remaining_sessions = bono_remaining_sessions;
  if (bono_expires_at !== undefined) patch.bono_expires_at = bono_expires_at;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, message: "Nada que actualizar" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  let payload: Record<string, unknown> = { ...patch };
  let error: PostgrestError | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await supabase.from("clients").update(payload).eq("id", id).eq("is_active", true);
    error = res.error;
    if (!error) break;
    if (error.code !== "42703" && !String(error.message ?? "").toLowerCase().includes("does not exist")) {
      break;
    }
    const msg = (error.message ?? "").toLowerCase();
    let stripped = false;
    if (msg.includes("bono_remaining") || msg.includes("bono_expires")) {
      delete payload.bono_remaining_sessions;
      delete payload.bono_expires_at;
      stripped = true;
    }
    if (msg.includes("origen_cliente")) {
      delete payload.origen_cliente;
      stripped = true;
    }
    if (msg.includes("lead_contacted")) {
      delete payload.lead_contacted_at;
      stripped = true;
    }
    if (!stripped) break;
    if (Object.keys(payload).length === 0) break;
  }

  if (error?.code === "23505") {
    return NextResponse.json(
      { ok: false, message: "Ya existe otro cliente con ese email o teléfono" },
      { status: 409 },
    );
  }
  if (error) {
    console.error("[admin/clients/[id]] PATCH", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
