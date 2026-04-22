import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ProductRow = {
  id: string;
  name: string;
  product_code: string;
  price_cents: number;
};

type FavoriteRow = {
  product_id: string;
};

export async function GET(request: Request) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const favoritesOnly = searchParams.get("favorites") === "1";

  const supabase = createSupabaseAdminClient();
  const { data: favoriteData, error: favoriteError } = await supabase
    .from("cash_product_favorites")
    .select("product_id")
    .eq("staff_id", auth.userId);

  if (favoriteError) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar favoritos" },
      { status: 500 },
    );
  }
  const favoriteIds = new Set((favoriteData ?? []).map((row) => (row as FavoriteRow).product_id));

  let rows: ProductRow[] = [];

  if (favoritesOnly) {
    if (favoriteIds.size > 0) {
      let favoritesQuery = supabase
        .from("products")
        .select("id, name, product_code, price_cents")
        .eq("is_active", true)
        .in("id", [...favoriteIds])
        .order("name", { ascending: true })
        .limit(6);
      if (q) favoritesQuery = favoritesQuery.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);

      const { data: favoriteProducts, error: favoritesError } = await favoritesQuery;
      if (favoritesError) {
        return NextResponse.json(
          { ok: false, message: "No se pudieron cargar productos favoritos" },
          { status: 500 },
        );
      }
      rows = (favoriteProducts ?? []) as ProductRow[];
    }
  } else {
    let listQuery = supabase
      .from("products")
      .select("id, name, product_code, price_cents")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(12);
    if (q) listQuery = listQuery.or(`name.ilike.%${q}%,product_code.ilike.%${q}%`);

    const { data: listData, error: listError } = await listQuery;
    if (listError) {
      return NextResponse.json(
        { ok: false, message: "No se pudieron cargar productos" },
        { status: 500 },
      );
    }
    rows = (listData ?? []) as ProductRow[];
    rows.sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 1 : 0;
      const bFav = favoriteIds.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name, "es");
    });
  }

  const products = rows.map((p) => ({
    id: p.id,
    name: p.name,
    productCode: p.product_code,
    priceEuros: p.price_cents / 100,
    isFavorite: favoriteIds.has(p.id),
  }));

  return NextResponse.json({ ok: true, products });
}
