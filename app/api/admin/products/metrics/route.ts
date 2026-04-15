import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ProductRow = {
  id: string;
  name: string;
  product_code: string;
  price_cents: number;
  is_active: boolean;
  created_at: string;
};

type ItemRow = {
  product_id: string | null;
  line_total_cents: number;
  cash_tickets: {
    created_at: string;
    staff_access: { full_name: string | null } | null;
  } | null;
};

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  const [productsRes, itemsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, product_code, price_cents, is_active, created_at")
      .order("name", { ascending: true }),
    supabase.from("cash_ticket_items").select(
      "product_id, line_total_cents, cash_tickets(created_at, staff_access(full_name))",
    ),
  ]);

  if (productsRes.error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar productos" },
      { status: 500 },
    );
  }

  if (itemsRes.error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar métricas de ventas" },
      { status: 500 },
    );
  }

  const byProduct = new Map<
    string,
    { salesCount: number; revenueCents: number; lastSaleAt: string | null; sellers: Set<string> }
  >();

  for (const item of (itemsRes.data ?? []) as ItemRow[]) {
    if (!item.product_id) continue;
    const metric = byProduct.get(item.product_id) ?? {
      salesCount: 0,
      revenueCents: 0,
      lastSaleAt: null,
      sellers: new Set<string>(),
    };
    metric.salesCount += 1;
    metric.revenueCents += item.line_total_cents;
    const saleAt = item.cash_tickets?.created_at ?? null;
    if (saleAt && (!metric.lastSaleAt || saleAt > metric.lastSaleAt)) {
      metric.lastSaleAt = saleAt;
    }
    const sellerName = item.cash_tickets?.staff_access?.full_name?.trim();
    if (sellerName) metric.sellers.add(sellerName);
    byProduct.set(item.product_id, metric);
  }

  const products = ((productsRes.data ?? []) as ProductRow[]).map((p) => {
    const metric = byProduct.get(p.id);
    return {
      id: p.id,
      name: p.name,
      productCode: p.product_code,
      priceEuros: p.price_cents / 100,
      isActive: p.is_active,
      createdAt: p.created_at,
      salesCount: metric?.salesCount ?? 0,
      revenueEuros: (metric?.revenueCents ?? 0) / 100,
      lastSaleAt: metric?.lastSaleAt ?? null,
      sellers: [...(metric?.sellers ?? new Set<string>())].slice(0, 5),
    };
  });

  return NextResponse.json({ ok: true, products });
}
