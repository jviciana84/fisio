import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { ticketId } = await context.params;
  if (!UUID_RE.test(ticketId)) {
    return NextResponse.json({ ok: false, message: "Ticket no válido." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_bonos")
    .select(
      "id, unique_code, product_name, sessions_total, sessions_remaining, expires_at, qr_data_url, clients(full_name, email, phone)",
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar bonos del ticket." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    bonos: (data ?? []).map((b) => {
      const c =
        typeof b.clients === "object" && b.clients !== null
          ? Array.isArray(b.clients)
            ? (b.clients[0] ?? null)
            : b.clients
          : null;
      return {
        id: b.id,
        uniqueCode: b.unique_code,
        productName: b.product_name,
        sessionsTotal: b.sessions_total,
        sessionsRemaining: b.sessions_remaining,
        expiresAt: b.expires_at,
        qrDataUrl: b.qr_data_url ?? null,
        clientName: c?.full_name ?? null,
        clientEmail: c?.email ?? null,
        clientPhone: c?.phone ?? null,
      };
    }),
  });
}
