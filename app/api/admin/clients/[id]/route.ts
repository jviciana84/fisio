import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { buildFullName, splitLegacyFullName, splitSurnameInput } from "@/lib/clients/name-parts";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function missingColumn(err: PostgrestError | null, name: string): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return (err.message ?? "").toLowerCase().includes(name.toLowerCase());
}

/** Columna referenciada pero ausente en la caché de esquema de PostgREST (p. ej. migración no aplicada). */
function isUnknownColumnError(err: PostgrestError): boolean {
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const m = (err.message ?? "").toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLIENT_SELECT_VARIANTS = [
  "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, is_active, tax_id, address, address_street, address_number, address_postal_code, address_city, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version, bono_remaining_sessions, bono_expires_at",
  "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, is_active, tax_id, address, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version, bono_remaining_sessions, bono_expires_at",
  "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version, bono_remaining_sessions, bono_expires_at",
  "id, client_code, full_name, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
  "id, client_code, full_name, email, phone, notes, created_at, is_active, estado_pago, lead_contacted_at",
  "id, client_code, full_name, email, phone, notes, created_at, is_active",
] as const;

type ClientDb = {
  id: string;
  client_code: string | null;
  full_name: string;
  first_name?: string | null;
  last_name_1?: string | null;
  last_name_2?: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  is_active: boolean | null;
  tax_id?: string | null;
  address?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
  estado_pago?: string | null;
  lead_contacted_at?: string | null;
  origen_cliente?: string | null;
  rgpd_consent_at?: string | null;
  rgpd_consent_version?: string | null;
  bono_remaining_sessions?: number | null;
  bono_expires_at?: string | null;
};

function mapClient(c: ClientDb) {
  const legacy = splitLegacyFullName(c.full_name);
  return {
    id: c.id,
    clientCode: c.client_code,
    fullName: c.full_name,
    firstName: c.first_name ?? legacy.firstName,
    lastName:
      c.last_name_1 || c.last_name_2
        ? [c.last_name_1 ?? "", c.last_name_2 ?? ""].join(" ").trim()
        : legacy.lastName,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.created_at,
    isActive: c.is_active ?? true,
    taxId: c.tax_id ?? null,
    address: c.address ?? null,
    addressStreet: c.address_street ?? null,
    addressNumber: c.address_number ?? null,
    addressPostalCode: c.address_postal_code ?? null,
    addressCity: c.address_city ?? null,
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
      !missingColumn(res.error, "tax_id") &&
      !missingColumn(res.error, "first_name") &&
      !missingColumn(res.error, "last_name_1") &&
      !missingColumn(res.error, "last_name_2") &&
      !missingColumn(res.error, "address") &&
      !missingColumn(res.error, "address_street") &&
      !missingColumn(res.error, "address_number") &&
      !missingColumn(res.error, "address_postal_code") &&
      !missingColumn(res.error, "address_city") &&
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
  const itemsByTicket: Record<
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

  const { data: bonosRows } = await supabase
    .from("client_bonos")
    .select(
      "id, ticket_id, unique_code, product_name, sessions_total, sessions_remaining, expires_at, qr_data_url, created_at",
    )
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const bonos = (bonosRows ?? []).map((b) => ({
    id: b.id,
    ticketId: b.ticket_id,
    uniqueCode: b.unique_code,
    productName: b.product_name,
    sessionsTotal: b.sessions_total,
    sessionsRemaining: b.sessions_remaining,
    expiresAt: b.expires_at,
    qrDataUrl: b.qr_data_url ?? null,
    createdAt: b.created_at,
  }));

  return NextResponse.json({ ok: true, client: mapClient(client), tickets, bonos });
}

type PatchBody = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  taxId?: string | null;
  address?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
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

  const firstNameRaw = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
  const lastNameRaw = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
  const fullNameRaw = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  let fullName: string | undefined;
  let first_name: string | undefined;
  let last_name_1: string | undefined;
  let last_name_2: string | null | undefined;
  if (firstNameRaw !== undefined || lastNameRaw !== undefined || fullNameRaw !== undefined) {
    const fallback = splitLegacyFullName(fullNameRaw ?? "");
    const firstName = (firstNameRaw ?? fallback.firstName).trim();
    const lastName = (lastNameRaw ?? fallback.lastName).trim();
    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, message: "Nombre y apellidos son obligatorios" }, { status: 400 });
    }
    const split = splitSurnameInput(lastName);
    fullName = buildFullName(firstName, lastName);
    first_name = firstName;
    last_name_1 = split.lastName1;
    last_name_2 = split.lastName2;
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

  let tax_id: string | null | undefined;
  if (body.taxId !== undefined) {
    const t = String(body.taxId ?? "").trim();
    tax_id = t.length ? t.slice(0, 32) : null;
  }

  let address: string | null | undefined;
  if (body.address !== undefined) {
    const a = String(body.address ?? "").trim();
    address = a.length ? a.slice(0, 500) : null;
  }

  let address_street: string | null | undefined;
  if (body.addressStreet !== undefined) {
    const s = String(body.addressStreet ?? "").trim();
    address_street = s.length ? s.slice(0, 200) : null;
  }

  let address_number: string | null | undefined;
  if (body.addressNumber !== undefined) {
    const s = String(body.addressNumber ?? "").trim();
    address_number = s.length ? s.slice(0, 32) : null;
  }

  let address_postal_code: string | null | undefined;
  if (body.addressPostalCode !== undefined) {
    const s = String(body.addressPostalCode ?? "").trim();
    address_postal_code = s.length ? s.slice(0, 16) : null;
  }

  let address_city: string | null | undefined;
  if (body.addressCity !== undefined) {
    const s = String(body.addressCity ?? "").trim();
    address_city = s.length ? s.slice(0, 120) : null;
  }

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
    // El listado de llamadas pendientes exige `pendiente_contacto` + `lead_contacted_at` null.
    estado_pago = "pendiente_contacto";
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
  if (first_name !== undefined) patch.first_name = first_name;
  if (last_name_1 !== undefined) patch.last_name_1 = last_name_1;
  if (last_name_2 !== undefined) patch.last_name_2 = last_name_2;
  if (email !== undefined) patch.email = email;
  if (phone !== undefined) patch.phone = phone;
  if (notes !== undefined) patch.notes = notes;
  if (tax_id !== undefined) patch.tax_id = tax_id;
  if (address !== undefined) patch.address = address;
  if (address_street !== undefined) patch.address_street = address_street;
  if (address_number !== undefined) patch.address_number = address_number;
  if (address_postal_code !== undefined) patch.address_postal_code = address_postal_code;
  if (address_city !== undefined) patch.address_city = address_city;
  if (estado_pago !== undefined) patch.estado_pago = estado_pago;
  if (origen_cliente !== undefined) patch.origen_cliente = origen_cliente;
  if (lead_contacted_at !== undefined) patch.lead_contacted_at = lead_contacted_at;
  if (bono_remaining_sessions !== undefined) patch.bono_remaining_sessions = bono_remaining_sessions;
  if (bono_expires_at !== undefined) patch.bono_expires_at = bono_expires_at;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, message: "Nada que actualizar" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const payload: Record<string, unknown> = { ...patch };
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { ok: false, message: "No quedan campos compatibles con la base de datos; revisa migraciones." },
        { status: 500 },
      );
    }

    const res = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id)
      .eq("is_active", true)
      .select("id");

    lastError = res.error;

    if (!lastError && res.data && res.data.length > 0) {
      return NextResponse.json({ ok: true });
    }

    // PostgREST no marca error si 0 filas coinciden: sin .select() parecía guardado OK.
    if (!lastError && (!res.data || res.data.length === 0)) {
      return NextResponse.json(
        { ok: false, message: "Cliente no encontrado o inactivo; no se ha actualizado nada." },
        { status: 404 },
      );
    }

    if (lastError?.code === "23505") {
      return NextResponse.json(
        { ok: false, message: "Ya existe otro cliente con ese email o teléfono" },
        { status: 409 },
      );
    }

    if (!lastError) {
      return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
    }

    if (!isUnknownColumnError(lastError)) {
      console.error("[admin/clients/[id]] PATCH", lastError);
      return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
    }

    const msg = (lastError.message ?? "").toLowerCase();
    let stripped = false;
    if (msg.includes("tax_id")) {
      delete payload.tax_id;
      stripped = true;
    }
    if (msg.includes("address")) {
      delete payload.address;
      delete payload.address_street;
      delete payload.address_number;
      delete payload.address_postal_code;
      delete payload.address_city;
      stripped = true;
    }
    if (msg.includes("first_name") || msg.includes("last_name_1") || msg.includes("last_name_2")) {
      delete payload.first_name;
      delete payload.last_name_1;
      delete payload.last_name_2;
      stripped = true;
    }
    if (msg.includes("estado_pago")) {
      delete payload.estado_pago;
      stripped = true;
    }
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
    if (!stripped) {
      console.error("[admin/clients/[id]] PATCH", lastError);
      return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
    }
  }

  if (lastError) {
    console.error("[admin/clients/[id]] PATCH", lastError);
  }
  return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
}
