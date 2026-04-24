import { NextResponse } from "next/server";
import { insertOnlineBooking } from "@/lib/booking/insert-online-booking";
import { upsertClientFromBooking } from "@/lib/clients/booking-upsert";
import { createBookingEvent } from "@/lib/google/calendar-api";
import { getGoogleCalendarIntegration } from "@/lib/google/integration-db";

export const dynamic = "force-dynamic";

type Body = {
  start?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAddress?: string;
  notes?: string;
  consentAccepted?: boolean;
};

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function POST(request: Request) {
  const integration = await getGoogleCalendarIntegration();
  if (!integration) {
    return NextResponse.json(
      { ok: false, message: "Las reservas online no están disponibles" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido" }, { status: 400 });
  }

  const startRaw = body.start?.trim();
  const patientName = body.patientName?.trim();
  const patientEmail = body.patientEmail?.trim().toLowerCase();
  const patientPhone = body.patientPhone?.trim();
  const patientAddress = body.patientAddress?.trim();

  if (!startRaw || !patientName || patientName.length < 2) {
    return NextResponse.json(
      { ok: false, message: "Indica nombre y fecha de la cita" },
      { status: 400 },
    );
  }

  if (!patientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
    return NextResponse.json(
      { ok: false, message: "Indica un email válido" },
      { status: 400 },
    );
  }

  const digits = patientPhone ? normalizePhoneDigits(patientPhone) : "";
  if (digits.length < 9 || digits.length > 15) {
    return NextResponse.json(
      { ok: false, message: "Indica un teléfono válido (mínimo 9 dígitos)" },
      { status: 400 },
    );
  }

  if (!patientAddress || patientAddress.length < 5) {
    return NextResponse.json(
      { ok: false, message: "Indica una dirección completa" },
      { status: 400 },
    );
  }

  if (body.consentAccepted !== true) {
    return NextResponse.json(
      { ok: false, message: "Debes aceptar la Política de Privacidad." },
      { status: 400 },
    );
  }

  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ ok: false, message: "Fecha no válida" }, { status: 400 });
  }

  const notes = body.notes?.trim() || undefined;

  try {
    const result = await createBookingEvent({
      start,
      patientName,
      patientEmail,
      patientPhone,
      patientAddress,
      notes,
    });

    const clientResult = await upsertClientFromBooking({
      fullName: patientName,
      email: patientEmail,
      phone: patientPhone!,
      address: patientAddress,
      userNotes: notes,
      appointmentStartIso: start.toISOString(),
    });

    const dbBooking = await insertOnlineBooking({
      startsAt: start,
      timezone: result.timezone,
      slotMinutes: result.slotMinutes,
      patientName,
      patientEmail,
      patientPhone: patientPhone!,
      patientAddress,
      notes,
      googleEventId: result.eventId,
      htmlLink: result.htmlLink,
    });

    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      htmlLink: result.htmlLink,
      clientRegistered: clientResult.ok,
      bookingCode: dbBooking.ok ? dbBooking.bookingCode : undefined,
      bookingSaved: dbBooking.ok,
      startsAt: start.toISOString(),
      timezone: result.timezone,
      slotMinutes: result.slotMinutes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear la cita";
    const status = msg.includes("no está disponible") ? 409 : 500;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
