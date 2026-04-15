import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ClientRow = {
  id: string;
  client_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
};

function compact(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const qRaw = compact(searchParams.get("q") ?? "");
  const q = qRaw.slice(0, 80);

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("clients")
    .select("id, client_code, full_name, email, phone")
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .limit(10);

  if (q) {
    const escaped = q.replace(/,/g, "");
    query = query.or(
      `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%,client_code.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar clientes" },
      { status: 500 },
    );
  }

  const clients = ((data ?? []) as ClientRow[]).map((c) => ({
    id: c.id,
    clientCode: c.client_code,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
  }));

  return NextResponse.json({ ok: true, clients });
}
