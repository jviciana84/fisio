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
    estadoPago: c.estado_pago ?? null,
    leadContactedAt: c.lead_contacted_at ?? null,
    origenCliente: c.origen_cliente ?? null,
    rgpdConsentAt: c.rgpd_consent_at ?? null,
    rgpdConsentVersion: c.rgpd_consent_version ?? null,
  }));

  return NextResponse.json({ ok: true, clients });
}
