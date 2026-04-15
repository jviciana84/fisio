import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/get-session";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopStatus } from "@/components/layout/DashboardTopStatus";
import { AdminIdleSessionGuard } from "@/components/session/AdminIdleSessionGuard";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.role === "admin";
  let displayName = isAdmin ? "Admin" : "Staff";

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("staff_access")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle();
    displayName = data?.full_name?.trim() || displayName;
  } catch {
    // Fallback al nombre por rol si falla Supabase.
  }

  return (
    <div className="app-shell-dashboard flex min-h-screen">
      <DashboardSidebar isAdmin={isAdmin} />
      <AdminIdleSessionGuard enabled={isAdmin}>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">
          <DashboardTopStatus userName={displayName} />
          {children}
        </div>
      </AdminIdleSessionGuard>
    </div>
  );
}
