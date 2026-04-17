import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";
import { computeAvailableSlots } from "@/lib/google/calendar-api";
import { getGoogleCalendarIntegration } from "@/lib/google/integration-db";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const integration = await getGoogleCalendarIntegration();
  if (!integration) {
    return NextResponse.json({
      ok: true,
      slots: [] as { start: string }[],
      slotMinutes: 45,
      timezone: "Europe/Madrid",
      available: false,
    });
  }

  const url = new URL(request.url);
  const rawFrom = url.searchParams.get("from");
  const from =
    rawFrom && YMD.test(rawFrom)
      ? rawFrom
      : formatInTimeZone(new Date(), integration.timezone, "yyyy-MM-dd");

  const rawDays = url.searchParams.get("days");
  const daysNum = rawDays != null ? Number(rawDays) : 14;
  const days = Math.min(90, Math.max(1, Number.isFinite(daysNum) ? daysNum : 14));

  const slots = await computeAvailableSlots({ fromYmd: from, days });

  return NextResponse.json({
    ok: true,
    slots,
    slotMinutes: integration.slot_minutes,
    timezone: integration.timezone,
    available: true,
  });
}
