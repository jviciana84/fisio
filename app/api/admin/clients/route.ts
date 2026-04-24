import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ClientRow = {
  id: string;
  client_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  tax_id?: string | null;
  address?: string | null;
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
    "id, client_code, full_name, email, phone, notes, created_at, tax_id, address, estado_pago, lead_contacted_at, origen_cliente, rgpd_consent_at, rgpd_consent_version",
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
    id: c.id,
    clientCode: c.client_code,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    ...(c.created_at ? { createdAt: c.created_at } : {}),
    taxId: c.tax_id ?? null,
    address: c.address ?? null,
    estadoPago: c.estado_pago ?? null,
    leadContactedAt: c.lead_contacted_at ?? null,
    origenCliente: c.origen_cliente ?? null,
    rgpdConsentAt: c.rgpd_consent_at ?? null,
    rgpdConsentVersion: c.rgpd_consent_version ?? null,
  }));

  return NextResponse.json({ ok: true, clients });
}

type PostBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  taxId?: string;
  address?: string;
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

  const fullName =
    typeof body.fullName === "string" ? body.fullName.replace(/\s+/g, " ").trim() : "";
  if (!fullName || fullName.length < 2) {
    return NextResponse.json(
      { ok: false, message: "El nombre es obligatorio (mínimo 2 caracteres)" },
      { status: 400 },
    );
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim().replace(/\s+/g, " ") : "";
  const phone = phoneRaw || null;
  const notesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
  const notes = notesRaw || null;
  const taxIdRaw = typeof body.taxId === "string" ? body.taxId.trim().slice(0, 32) : "";
  const tax_id = taxIdRaw || null;
  const addressRaw = typeof body.address === "string" ? body.address.trim().slice(0, 500) : "";
  const address = addressRaw || null;

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

  const core = { full_name: fullName, email, phone, notes, is_active: true as const };
  const withFiscal =
    tax_id || address
      ? { ...core, tax_id: tax_id ?? null, address: address ?? null }
      : core;
  const suffixes: Record<string, unknown>[] = [
    { origen_cliente: "fisico", estado_pago: "validado" },
    { estado_pago: "validado" },
    { origen_cliente: "fisico" },
    {},
  ];
  const variants: Record<string, unknown>[] = [
    ...suffixes.map((s) => ({ ...withFiscal, ...s })),
    ...(tax_id || address ? suffixes.map((s) => ({ ...core, ...s })) : []),
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
