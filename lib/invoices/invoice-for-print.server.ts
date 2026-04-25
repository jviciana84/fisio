import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** Alineado con `InvoicePdfClient` en `InvoicePdfContent` (evita importar el componente en servidor). */
export type InvoiceClientForPrint = {
  full_name: string | null;
  tax_id: string | null;
  address: string | null;
  address_street: string | null;
  address_number: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  email: string | null;
  phone: string | null;
  client_code: string | null;
};

export type InvoiceForPrint = {
  id: string;
  invoice_number: string;
  issue_date: string;
  payment_method: "cash" | "bizum" | "card";
  subtotal_cents: number;
  total_cents: number;
  notes: string | null;
  clients: InvoiceClientForPrint | InvoiceClientForPrint[] | null;
};

export type InvoiceLineForPrint = {
  concept: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export function paymentLabel(
  m: InvoiceForPrint["payment_method"],
): "Efectivo" | "Bizum" | "Tarjeta" {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

export function clientFromJoin(
  value: InvoiceForPrint["clients"],
): InvoiceClientForPrint | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getInvoiceForPrint(
  id: string,
): Promise<{ invoice: InvoiceForPrint; lines: InvoiceLineForPrint[] } | null> {
  const supabase = createSupabaseAdminClient();
  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        [
          "id, invoice_number, issue_date, payment_method, subtotal_cents, total_cents, notes",
          "clients(full_name, tax_id, address, address_street, address_number, address_postal_code, address_city, email, phone, client_code)",
        ].join(","),
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("concept, quantity, unit_price_cents, line_total_cents")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!invoice) {
    return null;
  }
  return {
    invoice: invoice as unknown as InvoiceForPrint,
    lines: (items ?? []) as InvoiceLineForPrint[],
  };
}
