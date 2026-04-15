import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ProductRow = {
  id: string;
  name: string;
  product_code: string;
  price_cents: number;
  is_favorite: boolean;
};

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const favoritesOnly = searchParams.get("favorites") === "1";

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("products")
    .select("id, name, product_code, price_cents, is_favorite")
    .eq("is_active", true)
    .order("is_favorite", { ascending: false })
    .order("name", { ascending: true })
    .limit(favoritesOnly ? 6 : 12);

  if (favoritesOnly) query = query.eq("is_favorite", true);
  if (q) query = query.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar productos" },
      { status: 500 },
    );
  }

  let rows = (data ?? []) as ProductRow[];
  if (favoritesOnly && rows.length < 6) {
    const { data: fallback } = await supabase
      .from("products")
      .select("id, name, product_code, price_cents, is_favorite")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(6);
    rows = (fallback ?? []) as ProductRow[];
  }

  const products = rows.map((p) => ({
    id: p.id,
    name: p.name,
    productCode: p.product_code,
    priceEuros: p.price_cents / 100,
    isFavorite: p.is_favorite,
  }));

  return NextResponse.json({ ok: true, products });
}
