import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/get-session";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
