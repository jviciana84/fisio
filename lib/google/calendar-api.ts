import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { google } from "googleapis";
import { env } from "@/lib/env";
import {
  getGoogleCalendarIntegration,
  type GoogleCalendarIntegrationRow,
} from "@/lib/google/integration-db";
import { getGoogleOAuthRedirectUri } from "@/lib/google/oauth-config";
import {
  eachBookingDateYmd,
  generateSlotStartsForDay,
  overlapsRange,
} from "@/lib/google/slots";
import { decryptSecret, getGoogleTokenSecret } from "@/lib/google/token-crypto";

export async function getAuthorizedCalendarClient(): Promise<{
  calendar: ReturnType<typeof google.calendar>;
  integration: GoogleCalendarIntegrationRow;
} | null> {
  const secret = getGoogleTokenSecret();
  const integration = await getGoogleCalendarIntegration();
  if (!secret || !integration || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  let refresh: string;
  try {
    refresh = decryptSecret(integration.refresh_token_encrypted, secret);
  } catch {
    return null;
  }
  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    getGoogleOAuthRedirectUri(),
  );
  oauth2.setCredentials({ refresh_token: refresh });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  return { calendar, integration };
}

export async function fetchBusyIntervals(
  timeMin: Date,
  timeMax: Date,
): Promise<{ start: Date; end: Date }[]> {
  const client = await getAuthorizedCalendarClient();
  if (!client) return [];
  const { calendar, integration } = client;
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: integration.calendar_id }],
    },
  });
  const busy = res.data.calendars?.[integration.calendar_id]?.busy ?? [];
  return busy
    .filter((b): b is { start?: string | null; end?: string | null } => !!b?.start && !!b?.end)
    .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
}

export async function computeAvailableSlots(params: {
  fromYmd: string;
  days: number;
  now?: Date;
}): Promise<{ start: string }[]> {
  const client = await getAuthorizedCalendarClient();
  if (!client) return [];
  const { integration } = client;
  const { fromYmd, days } = params;
  const now = params.now ?? new Date();
  const dates = eachBookingDateYmd(fromYmd, days);

  const candidates: Date[] = [];
  for (const ymd of dates) {
    const starts = generateSlotStartsForDay(
      ymd,
      integration.day_start_local,
      integration.day_end_local,
      integration.slot_minutes,
      integration.timezone,
    );
    for (const s of starts) {
      const e = addMinutes(s, integration.slot_minutes);
      if (e <= now) continue;
      candidates.push(s);
    }
  }

  if (candidates.length === 0) return [];

  let minT = candidates[0]!;
  let maxT = candidates[0]!;
  for (const s of candidates) {
    const e = addMinutes(s, integration.slot_minutes);
    if (s < minT) minT = s;
    if (e > maxT) maxT = e;
  }

  const busy = await fetchBusyIntervals(minT, maxT);

  const free: { start: string }[] = [];
  for (const s of candidates) {
    const e = addMinutes(s, integration.slot_minutes);
    const blocked = busy.some((b) => overlapsRange(s, e, b.start, b.end));
    if (!blocked) {
      free.push({ start: s.toISOString() });
    }
  }
  return free;
}

export async function isSlotFree(start: Date, end: Date): Promise<boolean> {
  const busy = await fetchBusyIntervals(start, end);
  return !busy.some((b) => overlapsRange(start, end, b.start, b.end));
}

export async function createBookingEvent(input: {
  start: Date;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  patientAddress?: string;
  notes?: string;
}): Promise<{
  eventId: string | null;
  htmlLink: string | null;
  timezone: string;
  slotMinutes: number;
}> {
  const client = await getAuthorizedCalendarClient();
  if (!client) {
    throw new Error("Calendar no configurado");
  }
  const { calendar, integration } = client;
  const end = addMinutes(input.start, integration.slot_minutes);

  const ok = await isSlotFree(input.start, end);
  if (!ok) {
    throw new Error("Ese horario ya no está disponible");
  }

  const tz = integration.timezone;
  const startStr = formatInTimeZone(input.start, tz, "yyyy-MM-dd'T'HH:mm:ss");
  const endStr = formatInTimeZone(end, tz, "yyyy-MM-dd'T'HH:mm:ss");

  const lines = [
    input.patientEmail ? `Email: ${input.patientEmail}` : "",
    input.patientPhone ? `Tel: ${input.patientPhone}` : "",
    input.patientAddress?.trim() ? `Dirección: ${input.patientAddress.trim()}` : "",
    input.notes ? `Notas: ${input.notes}` : "",
  ].filter(Boolean);

  const res = await calendar.events.insert({
    calendarId: integration.calendar_id,
    requestBody: {
      summary: `Cita: ${input.patientName}`,
      description: lines.join("\n"),
      start: { dateTime: startStr, timeZone: tz },
      end: { dateTime: endStr, timeZone: tz },
      attendees: input.patientEmail
        ? [{ email: input.patientEmail, responseStatus: "needsAction" as const }]
        : undefined,
    },
    sendUpdates: input.patientEmail ? "all" : "none",
  });

  return {
    eventId: res.data.id ?? null,
    htmlLink: res.data.htmlLink ?? null,
    timezone: tz,
    slotMinutes: integration.slot_minutes,
  };
}
