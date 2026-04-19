import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/get-session";

export default async function IngresosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getStaffSession();
  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
