import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SnapshotRow = {
  id: string;
  calendar_year: number;
  quarter: number;
  quarter_label: string | null;
  declare_cash_percent: number;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("fiscal_quarter_snapshots")
    .select("id, calendar_year, quarter, quarter_label, declare_cash_percent, payload, created_at")
    .order("calendar_year", { ascending: false })
    .order("quarter", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los históricos fiscales. ¿Migración 035 aplicada?" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, snapshots: (data ?? []) as SnapshotRow[] });
}

type Body = {
  calendarYear?: number;
  quarter?: number;
  quarterLabel?: string;
  declareCashPercent?: number;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const year = Math.round(Number(body.calendarYear));
    const q = Math.round(Number(body.quarter));
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ ok: false, message: "Año inválido" }, { status: 400 });
    }
    if (!Number.isFinite(q) || q < 1 || q > 4) {
      return NextResponse.json({ ok: false, message: "Trimestre inválido" }, { status: 400 });
    }

    const pct = Math.round(Number(body.declareCashPercent ?? 60));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ ok: false, message: "Porcentaje de efectivo inválido" }, { status: 400 });
    }

    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const quarterLabel =
      typeof body.quarterLabel === "string" && body.quarterLabel.trim().length > 0
        ? body.quarterLabel.trim()
        : `T${q} ${year}`;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fiscal_quarter_snapshots")
      .upsert(
        {
          calendar_year: year,
          quarter: q,
          quarter_label: quarterLabel,
          declare_cash_percent: pct,
          payload,
        },
        { onConflict: "calendar_year,quarter" },
      )
      .select("id, calendar_year, quarter, quarter_label, declare_cash_percent, payload, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, message: "No se pudo guardar el histórico" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot: data as SnapshotRow });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
