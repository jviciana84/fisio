import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { BonosActivosView, type BonosActivosRow } from "@/components/dashboard/BonosActivosView";

export const dynamic = "force-dynamic";

type BonoDb = {
  id: string;
  unique_code: string;
  product_name: string;
  sessions_total: number;
  sessions_remaining: number;
  purchased_at: string;
  expires_at: string;
  qr_data_url: string | null;
  is_active: boolean;
  clients:
    | {
        full_name: string | null;
        phone: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
        email: string | null;
      }[]
    | null;
};

function daysUntil(dateIso: string) {
  const today = new Date();
  const target = new Date(`${dateIso}T23:59:59`);
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function BonosActivosPage() {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_bonos")
    .select(
      "id, unique_code, product_name, sessions_total, sessions_remaining, purchased_at, expires_at, qr_data_url, is_active, clients(full_name, phone, email)",
    )
    .order("expires_at", { ascending: true })
    .limit(500);

  if (error) {
    return (
      <main className="p-6 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          No se pudieron cargar los bonos activos.
        </div>
      </main>
    );
  }

  const raw = (data ?? []) as BonoDb[];
  const active = raw.filter((b) => b.is_active && b.sessions_remaining > 0);

  const expiringSoon = active.filter((b) => {
    const d = daysUntil(b.expires_at);
    return d >= 0 && d <= 30;
  }).length;

  const pendingSessions = active.reduce((acc, b) => acc + b.sessions_remaining, 0);

  const bonos: BonosActivosRow[] = active.map((bono) => {
    const client = Array.isArray(bono.clients) ? (bono.clients[0] ?? null) : (bono.clients ?? null);
    return {
      id: bono.id,
      uniqueCode: bono.unique_code,
      productName: bono.product_name,
      sessionsTotal: bono.sessions_total,
      sessionsRemaining: bono.sessions_remaining,
      expiresAt: bono.expires_at,
      qrDataUrl: bono.qr_data_url ?? null,
      clientName: client?.full_name ?? null,
      purchasedAtIso: bono.purchased_at,
      clientFullName: client?.full_name ?? null,
      clientPhone: client?.phone ?? null,
      clientEmail: client?.email ?? null,
    };
  });

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <BonosActivosView bonos={bonos} stats={{ expiringSoon, pendingSessions }} />
      </div>
    </main>
  );
}
