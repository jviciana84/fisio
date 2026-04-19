import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { StaffDashboardLayout } from "@/components/dashboard/StaffDashboardLayout";
import { type StaffGridRow } from "@/components/dashboard/StaffMetricsGrid";
import { getStaffPublicAvatarUrl } from "@/lib/staff-public-avatar-url";

export const dynamic = "force-dynamic";

type StaffDbRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  employee_code: string | null;
  is_active: boolean;
  public_profile: boolean;
  public_specialty: string | null;
  public_bio: string | null;
  public_avatar_path: string | null;
  hourly_tariffs: unknown;
};

type TicketRow = {
  total_cents: number;
  payment_method: "cash" | "bizum" | "card";
  created_by_staff_id: string | null;
};

type WorkLogRow = {
  staff_id: string;
  worked_minutes: number;
};

type MetricAcc = {
  salesCount: number;
  totalSalesEuros: number;
  bizumEuros: number;
  cashEuros: number;
  workedHours: number;
};

const STAFF_SELECT_WITH_TARIFFS =
  "id, full_name, email, phone, role, employee_code, is_active, public_profile, public_specialty, public_bio, public_avatar_path, hourly_tariffs";
const STAFF_SELECT_NO_TARIFFS =
  "id, full_name, email, phone, role, employee_code, is_active, public_profile, public_specialty, public_bio, public_avatar_path";

export default async function StaffDashboardPage() {
  const supabase = createSupabaseAdminClient();

  const staffRes = await supabase
    .from("staff_access")
    .select(STAFF_SELECT_WITH_TARIFFS)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const needsTariffFallback =
    staffRes.error &&
    (staffRes.error.code === "42703" || String(staffRes.error.message ?? "").includes("hourly_tariffs"));

  const staffRowsRaw = needsTariffFallback
    ? (
        await supabase
          .from("staff_access")
          .select(STAFF_SELECT_NO_TARIFFS)
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      ).data ?? []
    : (staffRes.data ?? []);

  const [ticketsRes, logsRes] = await Promise.all([
    supabase.from("cash_tickets").select("total_cents, payment_method, created_by_staff_id"),
    supabase.from("staff_work_logs").select("staff_id, worked_minutes"),
  ]);

  const staffList: StaffDbRow[] = staffRowsRaw.map((row) => {
    const s = row as StaffDbRow;
    return {
      ...s,
      hourly_tariffs: s.hourly_tariffs ?? [],
    };
  });
  const tickets = (ticketsRes.data ?? []) as TicketRow[];
  const logs = (logsRes.data ?? []) as WorkLogRow[];

  const metrics = new Map<string, MetricAcc>();
  for (const s of staffList) {
    metrics.set(s.id, {
      salesCount: 0,
      totalSalesEuros: 0,
      bizumEuros: 0,
      cashEuros: 0,
      workedHours: 0,
    });
  }

  for (const t of tickets) {
    if (!t.created_by_staff_id) continue;
    const m = metrics.get(t.created_by_staff_id);
    if (!m) continue;
    const euros = t.total_cents / 100;
    m.salesCount += 1;
    m.totalSalesEuros += euros;
    if (t.payment_method === "bizum") m.bizumEuros += euros;
    if (t.payment_method === "cash") m.cashEuros += euros;
  }

  for (const log of logs) {
    const m = metrics.get(log.staff_id);
    if (!m) continue;
    m.workedHours += log.worked_minutes / 60;
  }

  const gridRows: StaffGridRow[] = staffList.map((s) => {
    const m = metrics.get(s.id) ?? {
      salesCount: 0,
      totalSalesEuros: 0,
      bizumEuros: 0,
      cashEuros: 0,
      workedHours: 0,
    };
    return {
      id: s.id,
      name: s.full_name,
      role: s.role,
      employee_code: s.employee_code,
      salesCount: m.salesCount,
      totalSalesEuros: m.totalSalesEuros,
      bizumEuros: m.bizumEuros,
      cashEuros: m.cashEuros,
      workedHours: m.workedHours,
      email: s.email,
      phone: s.phone,
      public_profile: s.public_profile,
      public_specialty: s.public_specialty,
      public_bio: s.public_bio,
      avatarUrl: getStaffPublicAvatarUrl(s.public_avatar_path),
      hourly_tariffs: s.hourly_tariffs,
    };
  });

  const rankingSales = [...gridRows].sort((a, b) => b.totalSalesEuros - a.totalSalesEuros);
  const rankingHours = [...gridRows].sort((a, b) => b.workedHours - a.workedHours);
  const rankingCash = [...gridRows].sort((a, b) => b.cashEuros - a.cashEuros);

  return (
    <main className="p-6 md:p-8">
      <StaffDashboardLayout
        gridRows={gridRows}
        rankingSales={rankingSales}
        rankingHours={rankingHours}
        rankingCash={rankingCash}
      />
    </main>
  );
}
