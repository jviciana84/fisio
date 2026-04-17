import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type GoogleCalendarIntegrationRow = {
  id: string;
  refresh_token_encrypted: string;
  calendar_id: string;
  connected_email: string | null;
  slot_minutes: number;
  day_start_local: string;
  day_end_local: string;
  timezone: string;
  updated_at: string;
};

export async function getGoogleCalendarIntegration(): Promise<GoogleCalendarIntegrationRow | null> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("google_calendar_integration")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[google-calendar] read integration", error);
    return null;
  }
  return data as GoogleCalendarIntegrationRow | null;
}

export async function saveGoogleOAuthTokens(
  refreshTokenEncrypted: string,
  connectedEmail: string | null,
): Promise<boolean> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const existing = await getGoogleCalendarIntegration();
  const supabase = createSupabaseAdminClient();
  if (existing) {
    const { error } = await supabase
      .from("google_calendar_integration")
      .update({
        refresh_token_encrypted: refreshTokenEncrypted,
        connected_email: connectedEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return !error;
  }

  const { error } = await supabase.from("google_calendar_integration").insert({
    refresh_token_encrypted: refreshTokenEncrypted,
    calendar_id: "primary",
    connected_email: connectedEmail,
    slot_minutes: 45,
    day_start_local: "09:00",
    day_end_local: "18:00",
    timezone: "Europe/Madrid",
  });
  return !error;
}

export async function deleteGoogleCalendarIntegration(): Promise<boolean> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_calendar_integration")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  return !error;
}

export async function updateGoogleCalendarSettings(
  patch: Partial<
    Pick<
      GoogleCalendarIntegrationRow,
      "slot_minutes" | "day_start_local" | "day_end_local" | "timezone" | "calendar_id"
    >
  >,
): Promise<boolean> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const existing = await getGoogleCalendarIntegration();
  if (!existing) return false;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_calendar_integration")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  return !error;
}
