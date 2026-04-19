import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/get-session";
import { PendingLeadsGlobalAlert } from "@/components/dashboard/PendingLeadsGlobalAlert";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopStatus } from "@/components/layout/DashboardTopStatus";
import { SectionWatermark } from "@/components/section-watermark";
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
          {/* Misma marca de agua que Contacto, fija al viewport; el contenido hace scroll encima. */}
          <div
            className="pointer-events-none fixed inset-0 z-0 gradient-mesh opacity-[0.38]"
            aria-hidden
          />
          <SectionWatermark align="right" fullViewport scaleFactor={1.05} />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-12 sm:pt-14">
            <DashboardTopStatus
              userName={displayName}
              sessionIssuedAtIso={session.issuedAt?.toISOString() ?? null}
              enablePinSwitch={!isAdmin}
            />
            <PendingLeadsGlobalAlert />
            {children}
          </div>
        </div>
      </AdminIdleSessionGuard>
    </div>
  );
}
