"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEuroEsTwoDecimals } from "@/lib/format-es";
import { Button } from "@/components/ui/button";

type Client = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
};

type Product = {
  id: string;
  name: string;
  productCode: string;
  priceEuros: number;
  isFavorite: boolean;
};

type Receipt = {
  ticketNumber: string;
  createdAt: string;
  paymentMethod: "cash" | "bizum" | "card";
  clientName: string | null;
  lines: { concept: string; amountEuros: number }[];
  totalEuros: number;
};

export function CashRegisterCard() {
  const [clientQuery, setClientQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [manualAmount, setManualAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bizum" | "card">("cash");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const allVisibleProducts = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of favorites) map.set(p.id, p);
    for (const p of products) map.set(p.id, p);
    return [...map.values()];
  }, [favorites, products]);

  const selectedProducts = useMemo(
    () => allVisibleProducts.filter((p) => selectedProductIds.includes(p.id)),
    [allVisibleProducts, selectedProductIds],
  );

  const manualAmountNum = useMemo(() => {
    const parsed = parseFloat(manualAmount.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [manualAmount]);

  const total = useMemo(() => {
    const productsTotal = selectedProducts.reduce((sum, p) => sum + p.priceEuros, 0);
    return productsTotal + manualAmountNum;
  }, [selectedProducts, manualAmountNum]);

  const canSave = total > 0 && !saving;

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/cash/products?favorites=1");
      const data = (await res.json()) as { ok?: boolean; products?: Product[] };
      if (res.ok && data.ok && data.products) setFavorites(data.products);
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        const q = productQuery.trim();
        if (!q) {
          setProducts([]);
          return;
        }
        const res = await fetch(`/api/admin/cash/products?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { ok?: boolean; products?: Product[] };
        if (res.ok && data.ok && data.products) setProducts(data.products);
      })();
    }, 250);
    return () => clearTimeout(id);
  }, [productQuery]);

  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        const q = clientQuery.trim();
        if (!q) {
          setClients([]);
          return;
        }
        const res = await fetch(`/api/admin/clients?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { ok?: boolean; clients?: Client[] };
        if (res.ok && data.ok && data.clients) setClients(data.clients);
      })();
    }, 250);
    return () => clearTimeout(id);
  }, [clientQuery]);

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cash/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id ?? null,
          productIds: selectedProductIds,
          manualAmountEuros: manualAmountNum,
          paymentMethod,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; receipt?: Receipt };
      if (!res.ok || !data.ok || !data.receipt) {
        setMessage({ type: "err", text: data.message ?? "No se pudo generar el ticket." });
        return;
      }
      setReceipt(data.receipt);
      setMessage({ type: "ok", text: "Ticket grabado correctamente." });
      setProductQuery("");
      setSelectedProductIds([]);
      setManualAmount("");
    } catch {
      setMessage({ type: "err", text: "Error de red al grabar ticket." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-panel-strong glass-tint-blue xl:col-span-12 p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Caja</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Cobro rápido y ticket</h2>
        </div>
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30">
          Total actual: {formatEuroEsTwoDecimals(total)}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="glass-inner p-5 shadow-sm ring-1 ring-white/50 xl:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
          <label className="mt-2 block text-sm font-medium text-slate-700">Nº cliente / nombre / teléfono / email</label>
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Buscar cliente..."
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-auto">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClient(c);
                  setClientQuery(c.fullName);
                  setClients([]);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-blue-50"
              >
                <p className="font-semibold text-slate-900">{c.fullName}</p>
                <p className="text-slate-500">
                  {c.clientCode ?? "Sin código"} · {c.phone ?? "Sin teléfono"} · {c.email ?? "Sin email"}
                </p>
              </button>
            ))}
          </div>
          {selectedClient ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              Cliente seleccionado: {selectedClient.fullName}
            </p>
          ) : null}
        </div>

        <div className="glass-inner p-5 shadow-sm ring-1 ring-white/50 xl:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</p>
          <label className="mt-2 block text-sm font-medium text-slate-700">Buscar y añadir productos</label>
          <input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Escribe nombre o código..."
          />
          <div className="mt-2 max-h-32 space-y-1 overflow-auto">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProduct(p.id)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-blue-50"
              >
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="text-slate-500">{formatEuroEsTwoDecimals(p.priceEuros)}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Favoritos (6)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {favorites.slice(0, 6).map((f) => (
              <label
                key={f.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(f.id)}
                  onChange={() => toggleProduct(f.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="glass-inner rounded-2xl p-5 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Importe y pago</p>
          <label className="mt-2 block text-sm font-medium text-slate-700">Importe manual (€)</label>
          <input
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="0,00"
            inputMode="decimal"
          />
          <p className="mt-3 text-sm font-medium text-slate-700">Forma de pago</p>
          <div className="mt-2 grid gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              Efectivo
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "bizum"}
                onChange={() => setPaymentMethod("bizum")}
              />
              Bizum
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              Tarjeta
            </label>
          </div>
          <Button
            type="button"
            variant="gradient"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-45"
          >
            {saving ? "Grabando ticket..." : "Grabar y generar recibo"}
          </Button>
        </div>
      </div>

      {selectedProducts.length > 0 ? (
        <div className="glass-inner mt-4 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen productos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <span key={p.id} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {p.name} · {formatEuroEsTwoDecimals(p.priceEuros)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {receipt ? (
        <div className="glass-inner mt-4 p-5 shadow-inner ring-1 ring-white/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Ticket {receipt.ticketNumber}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {receipt.paymentMethod === "cash"
                ? "Efectivo"
                : receipt.paymentMethod === "bizum"
                  ? "Bizum"
                  : "Tarjeta"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(receipt.createdAt).toLocaleString("es-ES")} ·{" "}
            {receipt.clientName ? `Cliente: ${receipt.clientName}` : "Cliente sin asignar"}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            {receipt.lines.map((line, idx) => (
              <div key={`${line.concept}-${idx}`} className="flex items-center justify-between">
                <span className="text-slate-700">{line.concept}</span>
                <span className="font-medium text-slate-900">{formatEuroEsTwoDecimals(line.amountEuros)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3 text-right text-lg font-bold text-slate-900">
            Total {formatEuroEsTwoDecimals(receipt.totalEuros)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
