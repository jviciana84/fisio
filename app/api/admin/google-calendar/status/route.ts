import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { env } from "@/lib/env";
import { getGoogleCalendarIntegration } from "@/lib/google/integration-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const envOk = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const row = await getGoogleCalendarIntegration();

  return NextResponse.json({
    ok: true,
    envConfigured: envOk,
    connected: Boolean(row),
    email: row?.connected_email ?? null,
    slotMinutes: row?.slot_minutes ?? 45,
    dayStart: row?.day_start_local ?? "09:00",
    dayEnd: row?.day_end_local ?? "18:00",
    timezone: row?.timezone ?? "Europe/Madrid",
    calendarId: row?.calendar_id ?? "primary",
  });
}
