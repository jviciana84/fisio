import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { buildFullName, splitLegacyFullName, splitSurnameInput } from "@/lib/clients/name-parts";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ClientRow = {
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
  tax_id?: string | null;
  address?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
  estado_pago: string | null;
  lead_contacted_at: string | null;
  origen_cliente?: string | null;
  rgpd_consent_at?: string | null;
  rgpd_consent_version?: string | null;
};

function missingColumn(err: PostgrestError | null, name: string): boolean {
  if (!err) return false;
  if (err.code === "42703") return true;
  return (err.message ?? "").toLowerCase().includes(name.toLowerCase());
}

function compact(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const qRaw = compact(searchParams.get("q") ?? "");
  const q = qRaw.slice(0, 80);

  const supabase = createSupabaseAdminClient();

  const selectVariants = [
    "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, tax_id, address, address_street, address_number, address_postal_code, address_city, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
    "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, tax_id, address, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
    "id, client_code, full_name, first_name, last_name_1, last_name_2, email, phone, notes, created_at, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
    "id, client_code, full_name, email, phone, notes, created_at, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
    "id, client_code, full_name, email, phone, notes, created_at, estado_pago, lead_contacted_at, rgpd_consent_at, rgpd_consent_version",
    "id, client_code, full_name, email, phone, notes, created_at, estado_pago",
    "id, client_code, full_name, email, phone, notes, created_at",
    "id, client_code, full_name, email, phone, notes",
  ] as const;

  let data: ClientRow[] | null = null;
  let lastError: PostgrestError | null = null;

  for (const sel of selectVariants) {
    let query = supabase.from("clients").select(sel).eq("is_active", true).order("full_name", { ascending: true });

    if (q) {
      const escaped = q.replace(/,/g, "");
      query = query
        .or(
          `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%,client_code.ilike.%${escaped}%`,
        )
        .limit(10);
    } else {
      query = query.limit(2000);
    }

    const res = await query;
    if (!res.error) {
      data = (res.data ?? []) as unknown as ClientRow[];
      break;
    }
    lastError = res.error;
    if (
      !missingColumn(res.error, "tax_id") &&
      !missingColumn(res.error, "address") &&
      !missingColumn(res.error, "first_name") &&
      !missingColumn(res.error, "last_name_1") &&
      !missingColumn(res.error, "last_name_2") &&
      !missingColumn(res.error, "address_street") &&
      !missingColumn(res.error, "address_number") &&
      !missingColumn(res.error, "address_postal_code") &&
      !missingColumn(res.error, "address_city") &&
      !missingColumn(res.error, "origen_cliente") &&
      !missingColumn(res.error, "rgpd_consent_at") &&
      !missingColumn(res.error, "lead_contacted_at") &&
      !missingColumn(res.error, "estado_pago") &&
      !missingColumn(res.error, "created_at")
    ) {
      break;
    }
  }

  if (!data) {
    console.error("[admin/clients]", lastError);
    return NextResponse.json(
      {
        ok: false,
        message: "No se pudieron cargar clientes. Revisa la consola del servidor o las migraciones de Supabase.",
      },
      { status: 500 },
    );
  }

  const clients = data.map((c) => ({
    ...(c.first_name || c.last_name_1 || c.last_name_2
      ? {
          firstName: c.first_name ?? "",
          lastName: [c.last_name_1 ?? "", c.last_name_2 ?? ""].join(" ").trim(),
        }
      : {
          firstName: splitLegacyFullName(c.full_name).firstName,
          lastName: splitLegacyFullName(c.full_name).lastName,
        }),
    id: c.id,
    clientCode: c.client_code,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    ...(c.created_at ? { createdAt: c.created_at } : {}),
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
  }));

  return NextResponse.json({ ok: true, clients });
}

type PostBody = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  taxId?: string;
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressPostalCode?: string;
  addressCity?: string;
};

export async function POST(request: Request) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido" }, { status: 400 });
  }

  const firstNameRaw = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastNameRaw = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const legacyFullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const fallback = splitLegacyFullName(legacyFullName);
  const firstName = (firstNameRaw || fallback.firstName).replace(/\s+/g, " ").trim();
  const lastName = (lastNameRaw || fallback.lastName).replace(/\s+/g, " ").trim();
  if (!firstName || !lastName) {
    return NextResponse.json(
      { ok: false, message: "Nombre y apellidos son obligatorios" },
      { status: 400 },
    );
  }
  const { lastName1, lastName2 } = splitSurnameInput(lastName);
  const fullName = buildFullName(firstName, lastName);

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim().replace(/\s+/g, " ") : "";
  const phone = phoneRaw || null;
  if (!phone) {
    return NextResponse.json({ ok: false, message: "El teléfono es obligatorio" }, { status: 400 });
  }
  const notesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
  const notes = notesRaw || null;
  const taxIdRaw = typeof body.taxId === "string" ? body.taxId.trim().slice(0, 32) : "";
  const tax_id = taxIdRaw || null;
  const addressRaw = typeof body.address === "string" ? body.address.trim().slice(0, 500) : "";
  const address = addressRaw || null;
  const addressStreetRaw = typeof body.addressStreet === "string" ? body.addressStreet.trim().slice(0, 200) : "";
  const addressStreet = addressStreetRaw || null;
  const addressNumberRaw = typeof body.addressNumber === "string" ? body.addressNumber.trim().slice(0, 32) : "";
  const addressNumber = addressNumberRaw || null;
  const addressPostalRaw =
    typeof body.addressPostalCode === "string" ? body.addressPostalCode.trim().slice(0, 16) : "";
  const addressPostalCode = addressPostalRaw || null;
  const addressCityRaw = typeof body.addressCity === "string" ? body.addressCity.trim().slice(0, 120) : "";
  const addressCity = addressCityRaw || null;

  const supabase = createSupabaseAdminClient();

  if (email) {
    const { data: dup } = await supabase.from("clients").select("id").eq("email", email).maybeSingle();
    if (dup) {
      return NextResponse.json({ ok: false, message: "Ya existe un cliente con ese email" }, { status: 409 });
    }
  }
  if (phone) {
    const { data: dupP } = await supabase.from("clients").select("id").eq("phone", phone).maybeSingle();
    if (dupP) {
      return NextResponse.json({ ok: false, message: "Ya existe un cliente con ese teléfono" }, { status: 409 });
    }
  }

  const coreWithParts = {
    full_name: fullName,
    first_name: firstName,
    last_name_1: lastName1,
    last_name_2: lastName2,
    email,
    phone,
    notes,
    is_active: true as const,
  };
  const coreLegacy = { full_name: fullName, email, phone, notes, is_active: true as const };
  const withFiscal =
    tax_id || address || addressStreet || addressNumber || addressPostalCode || addressCity
      ? {
          ...coreWithParts,
          tax_id: tax_id ?? null,
          address: address ?? null,
          address_street: addressStreet ?? null,
          address_number: addressNumber ?? null,
          address_postal_code: addressPostalCode ?? null,
          address_city: addressCity ?? null,
        }
      : coreWithParts;
  const withFiscalLegacy =
    tax_id || address || addressStreet || addressNumber || addressPostalCode || addressCity
      ? {
          ...coreLegacy,
          tax_id: tax_id ?? null,
          address: address ?? null,
          address_street: addressStreet ?? null,
          address_number: addressNumber ?? null,
          address_postal_code: addressPostalCode ?? null,
          address_city: addressCity ?? null,
        }
      : coreLegacy;
  const suffixes: Record<string, unknown>[] = [
    { origen_cliente: "fisico", estado_pago: "validado" },
    { estado_pago: "validado" },
    { origen_cliente: "fisico" },
    {},
  ];
  const variants: Record<string, unknown>[] = [
    ...suffixes.map((s) => ({ ...withFiscal, ...s })),
    ...suffixes.map((s) => ({ ...withFiscalLegacy, ...s })),
    ...(tax_id || address || addressStreet || addressNumber || addressPostalCode || addressCity
      ? [...suffixes.map((s) => ({ ...coreWithParts, ...s })), ...suffixes.map((s) => ({ ...coreLegacy, ...s }))]
      : []),
  ];

  let lastError: PostgrestError | null = null;
  for (const row of variants) {
    const ins = await supabase.from("clients").insert(row as never).select("id").maybeSingle();
    if (!ins.error && ins.data?.id) {
      return NextResponse.json({ ok: true, id: ins.data.id as string });
    }
    lastError = ins.error;
    if (!ins.error) continue;
    if (
      !missingColumn(ins.error, "tax_id") &&
      !missingColumn(ins.error, "address") &&
      !missingColumn(ins.error, "first_name") &&
      !missingColumn(ins.error, "last_name_1") &&
      !missingColumn(ins.error, "last_name_2") &&
      !missingColumn(ins.error, "origen_cliente") &&
      !missingColumn(ins.error, "estado_pago") &&
      !missingColumn(ins.error, "is_active")
    ) {
      break;
    }
  }

  if (lastError?.code === "23505") {
    return NextResponse.json(
      { ok: false, message: "Email o teléfono ya registrado en otro cliente" },
      { status: 409 },
    );
  }
  console.error("[admin/clients] POST", lastError);
  return NextResponse.json({ ok: false, message: "No se pudo crear el cliente" }, { status: 500 });
}
