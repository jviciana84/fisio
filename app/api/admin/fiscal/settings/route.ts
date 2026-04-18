import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FiscalRow = {
  id: number;
  declare_cash_percent: number;
  rent_is_leased: boolean;
  monthly_rent_cents: number;
  official_liquidity_cents: number;
  sales_include_vat: boolean;
  sales_vat_rate_percent: number;
  use_vat_on_sales: boolean;
  expense_vat_recoverable_percent: number;
};

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("fiscal_settings").select("*").eq("id", 1).maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los ajustes fiscales. ¿Migración 014 aplicada?" },
      { status: 500 },
    );
  }

  if (!data) {
    await supabase.from("fiscal_settings").insert({ id: 1 });
    const { data: created } = await supabase.from("fiscal_settings").select("*").eq("id", 1).single();
    return NextResponse.json({ ok: true, settings: mapRow(created as FiscalRow) });
  }

  return NextResponse.json({ ok: true, settings: mapRow(data as FiscalRow) });
}

type Body = {
  declareCashPercent?: number;
  rentIsLeased?: boolean;
  monthlyRentEuros?: number;
  officialLiquidityEuros?: number;
  salesIncludeVat?: boolean;
  salesVatRatePercent?: number;
  useVatOnSales?: boolean;
  expenseVatRecoverablePercent?: number;
};

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const supabase = createSupabaseAdminClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.declareCashPercent !== undefined) {
      const v = Math.round(Number(body.declareCashPercent));
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ ok: false, message: "Porcentaje inválido" }, { status: 400 });
      }
      patch.declare_cash_percent = v;
    }
    if (body.rentIsLeased !== undefined) patch.rent_is_leased = Boolean(body.rentIsLeased);
    if (body.monthlyRentEuros !== undefined) {
      const e = Number(body.monthlyRentEuros);
      if (!Number.isFinite(e) || e < 0) {
        return NextResponse.json({ ok: false, message: "Alquiler inválido" }, { status: 400 });
      }
      patch.monthly_rent_cents = Math.round(e * 100);
    }
    if (body.officialLiquidityEuros !== undefined) {
      const e = Number(body.officialLiquidityEuros);
      if (!Number.isFinite(e) || e < 0) {
        return NextResponse.json({ ok: false, message: "Liquidez inválida" }, { status: 400 });
      }
      patch.official_liquidity_cents = Math.round(e * 100);
    }
    if (body.salesIncludeVat !== undefined) patch.sales_include_vat = Boolean(body.salesIncludeVat);
    if (body.salesVatRatePercent !== undefined) {
      const v = Math.round(Number(body.salesVatRatePercent));
      if (!Number.isFinite(v) || v < 0 || v > 21) {
        return NextResponse.json({ ok: false, message: "Tipo IVA inválido" }, { status: 400 });
      }
      patch.sales_vat_rate_percent = v;
    }
    if (body.useVatOnSales !== undefined) patch.use_vat_on_sales = Boolean(body.useVatOnSales);
    if (body.expenseVatRecoverablePercent !== undefined) {
      const v = Math.round(Number(body.expenseVatRecoverablePercent));
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ ok: false, message: "Porcentaje IVA deducible inválido" }, { status: 400 });
      }
      patch.expense_vat_recoverable_percent = v;
    }

    const { data: current, error: loadErr } = await supabase
      .from("fiscal_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json({ ok: false, message: "No se pudieron leer los ajustes" }, { status: 500 });
    }

    if (!current) {
      await supabase.from("fiscal_settings").insert({ id: 1 });
    }

    const { data: base } = await supabase.from("fiscal_settings").select("*").eq("id", 1).single();
    if (!base) {
      return NextResponse.json({ ok: false, message: "No se pudo crear el registro fiscal" }, { status: 500 });
    }

    const merged = { ...base, ...patch };
    const { data: saved, error } = await supabase
      .from("fiscal_settings")
      .update(merged)
      .eq("id", 1)
      .select("*")
      .single();

    if (error || !saved) {
      return NextResponse.json({ ok: false, message: "No se pudieron guardar los ajustes" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, settings: mapRow(saved as FiscalRow) });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}

function mapRow(row: FiscalRow) {
  return {
    declareCashPercent: row.declare_cash_percent,
    rentIsLeased: row.rent_is_leased,
    monthlyRentEuros: row.monthly_rent_cents / 100,
    officialLiquidityEuros: row.official_liquidity_cents / 100,
    salesIncludeVat: row.sales_include_vat,
    salesVatRatePercent: row.sales_vat_rate_percent,
    useVatOnSales: row.use_vat_on_sales,
    expenseVatRecoverablePercent: row.expense_vat_recoverable_percent,
  };
}
