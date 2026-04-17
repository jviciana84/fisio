import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  getGoogleCalendarIntegration,
  updateGoogleCalendarSettings,
} from "@/lib/google/integration-db";
import { parseHm } from "@/lib/google/slots";

export const dynamic = "force-dynamic";

type Body = {
  slotMinutes?: number;
  dayStart?: string;
  dayEnd?: string;
  timezone?: string;
  calendarId?: string;
};

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const existing = await getGoogleCalendarIntegration();
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Conecta primero el calendario con Google" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido" }, { status: 400 });
  }

  const patch: Parameters<typeof updateGoogleCalendarSettings>[0] = {};

  if (body.slotMinutes != null) {
    const n = Number(body.slotMinutes);
    if (!Number.isFinite(n) || n < 15 || n > 180) {
      return NextResponse.json(
        { ok: false, message: "Duración de cita: entre 15 y 180 minutos" },
        { status: 400 },
      );
    }
    patch.slot_minutes = Math.round(n);
  }

  if (body.dayStart != null) {
    if (!parseHm(body.dayStart)) {
      return NextResponse.json(
        { ok: false, message: "Hora de apertura: formato HH:MM" },
        { status: 400 },
      );
    }
    patch.day_start_local = body.dayStart.trim();
  }

  if (body.dayEnd != null) {
    if (!parseHm(body.dayEnd)) {
      return NextResponse.json(
        { ok: false, message: "Hora de cierre: formato HH:MM" },
        { status: 400 },
      );
    }
    patch.day_end_local = body.dayEnd.trim();
  }

  if (body.timezone != null) {
    const tz = body.timezone.trim();
    if (tz.length < 3 || tz.length > 80) {
      return NextResponse.json({ ok: false, message: "Zona horaria no válida" }, { status: 400 });
    }
    patch.timezone = tz;
  }

  if (body.calendarId != null) {
    const cid = body.calendarId.trim();
    if (!cid) {
      return NextResponse.json({ ok: false, message: "ID de calendario vacío" }, { status: 400 });
    }
    patch.calendar_id = cid;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, message: "Nada que actualizar" }, { status: 400 });
  }

  const ok = await updateGoogleCalendarSettings(patch);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
