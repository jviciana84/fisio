import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type InsertOnlineBookingParams = {
  startsAt: Date;
  timezone: string;
  slotMinutes: number;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  notes?: string;
  googleEventId: string | null;
  htmlLink: string | null;
};

function makeCode(): string {
  return `FRB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Registra la cita en BD con código único (reintenta si hay colisión).
 */
export async function insertOnlineBooking(
  params: InsertOnlineBookingParams,
): Promise<{ ok: true; bookingCode: string } | { ok: false }> {
  const supabase = createSupabaseAdminClient();

  for (let attempt = 0; attempt < 10; attempt++) {
    const booking_code = makeCode();
    const { error } = await supabase.from("online_bookings").insert({
      booking_code,
      starts_at: params.startsAt.toISOString(),
      timezone: params.timezone,
      slot_minutes: params.slotMinutes,
      patient_name: params.patientName.trim(),
      patient_email: params.patientEmail.trim().toLowerCase(),
      patient_phone: params.patientPhone.trim(),
      patient_address: params.patientAddress.trim(),
      notes: params.notes?.trim() || null,
      google_event_id: params.googleEventId,
      html_link: params.htmlLink,
    });

    if (!error) {
      return { ok: true, bookingCode: booking_code };
    }

    if (error.code === "23505") {
      continue;
    }

    if (error.code === "42P01" || error.message?.includes("online_bookings")) {
      console.error("[booking] tabla online_bookings no disponible; aplica migraciones Supabase", error);
    } else {
      console.error("[booking] insert online_bookings", error);
    }
    return { ok: false };
  }

  return { ok: false };
}
