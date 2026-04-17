import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { deleteGoogleCalendarIntegration } from "@/lib/google/integration-db";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const ok = await deleteGoogleCalendarIntegration();
  if (!ok) {
    return NextResponse.json(
      { ok: false, message: "No se pudo desconectar el calendario" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
