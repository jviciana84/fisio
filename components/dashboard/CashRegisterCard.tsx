"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Star, X } from "lucide-react";
import { formatEuroEsTwoDecimals } from "@/lib/format-es";
import { Button } from "@/components/ui/button";

type Client = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  createdAt?: string | null;
  estadoPago?: string | null;
  leadContactedAt?: string | null;
  origenCliente?: string | null;
  rgpdConsentAt?: string | null;
  rgpdConsentVersion?: string | null;
  bonoRemainingSessions?: number | null;
  bonoExpiresAt?: string | null;
  isActive?: boolean;
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
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<string[]>([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [createClientName, setCreateClientName] = useState("");
  const [createClientEmail, setCreateClientEmail] = useState("");
  const [createClientPhone, setCreateClientPhone] = useState("");
  const [createClientNotes, setCreateClientNotes] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState<string | null>(null);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
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

  function formatClientDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES");
  }

  function resetCreateClientForm() {
    setCreateClientName("");
    setCreateClientEmail("");
    setCreateClientPhone("");
    setCreateClientNotes("");
    setClientModalError(null);
  }

  async function loadClientDetail(clientId: string) {
    setLoadingClientDetail(true);
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`);
      const data = (await res.json()) as { ok?: boolean; client?: Client; message?: string };
      if (res.ok && data.ok && data.client) {
        setSelectedClient(data.client);
      }
    } finally {
      setLoadingClientDetail(false);
    }
  }

  async function handleCreateClient() {
    const fullName = createClientName.trim();
    if (fullName.length < 2) {
      setClientModalError("El nombre es obligatorio (mínimo 2 caracteres).");
      return;
    }
    setCreatingClient(true);
    setClientModalError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: createClientEmail.trim() || undefined,
          phone: createClientPhone.trim() || undefined,
          notes: createClientNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || !data.ok || !data.id) {
        setClientModalError(data.message ?? "No se pudo crear el cliente.");
        return;
      }

      setClientModalOpen(false);
      setClientQuery(fullName);
      setMessage({ type: "ok", text: "Cliente creado correctamente." });
      resetCreateClientForm();
      await loadClientDetail(data.id);
      setSelectedClient((prev) => (prev ? prev : { id: data.id, fullName, clientCode: null, email: null, phone: null }));
    } catch {
      setClientModalError("Error de red al crear cliente.");
    } finally {
      setCreatingClient(false);
    }
  }

  async function setProductFavorite(productId: string, favorite: boolean) {
    if (favoriteSavingIds.includes(productId)) return;
    const favoriteProduct = allVisibleProducts.find((p) => p.id === productId) ?? null;
    setFavoriteSavingIds((prev) => [...prev, productId]);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isFavorite: favorite } : p)),
    );
    setFavorites((prev) =>
      favorite
        ? prev.some((p) => p.id === productId)
          ? prev
          : favoriteProduct
            ? [...prev, { ...favoriteProduct, isFavorite: true }]
            : prev
        : prev.filter((p) => p.id !== productId),
    );
    try {
      const res = await fetch(`/api/admin/cash/products/${encodeURIComponent(productId)}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isFavorite: !favorite } : p)),
        );
        setFavorites((prev) =>
          !favorite
            ? prev.some((p) => p.id === productId)
              ? prev
              : favoriteProduct
                ? [...prev, { ...favoriteProduct, isFavorite: true }]
                : prev
            : prev.filter((p) => p.id !== productId),
        );
        setMessage({ type: "err", text: data.message ?? "No se pudo actualizar favorito." });
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isFavorite: !favorite } : p)),
      );
      setFavorites((prev) =>
        !favorite
          ? prev.some((p) => p.id === productId)
            ? prev
            : favoriteProduct
              ? [...prev, { ...favoriteProduct, isFavorite: true }]
              : prev
          : prev.filter((p) => p.id !== productId),
      );
      setMessage({ type: "err", text: "Error de red al guardar favorito." });
    } finally {
      setFavoriteSavingIds((prev) => prev.filter((id) => id !== productId));
    }
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
    <section className="glass-panel-strong glass-tint-blue relative overflow-hidden rounded-3xl border border-blue-100/70 bg-gradient-to-br from-white/95 via-sky-50/70 to-cyan-50/70 xl:col-span-12 p-4 md:p-5">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-sky-300/20 to-cyan-300/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/15 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/75 bg-white/65 px-3 py-2.5 shadow-[0_14px_26px_-20px_rgba(14,116,144,0.45)] backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">Caja</p>
          <h2 className="mt-1 bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-xl font-semibold tracking-tight text-transparent md:text-[1.75rem]">
            Cobro rápido y ticket
          </h2>
        </div>
        <div className="rounded-full border border-white/40 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_25px_-14px_rgba(37,99,235,0.85)]">
          Total actual: {formatEuroEsTwoDecimals(total)}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="glass-inner relative rounded-2xl border border-white/70 bg-gradient-to-b from-white/90 to-blue-50/45 p-4 shadow-[0_16px_28px_-22px_rgba(30,64,175,0.55)] ring-1 ring-blue-100/60 xl:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Cliente</p>
            <button
              type="button"
              onClick={() => {
                resetCreateClientForm();
                setClientModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/80 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Añadir cliente
            </button>
          </div>
          <label className="mt-1.5 block text-sm font-medium text-slate-700">
            Nº cliente / nombre / teléfono / email
          </label>
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blue-100/90 bg-white/95 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Buscar cliente..."
          />
          <div className="mt-2 max-h-32 space-y-1 overflow-auto pr-0.5">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClient(c);
                  setClientQuery(c.fullName);
                  setClients([]);
                  void loadClientDetail(c.id);
                }}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left text-xs transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/80"
              >
                <p className="font-semibold text-slate-900">{c.fullName}</p>
                <p className="text-slate-500">
                  {c.clientCode ?? "Sin código"} · {c.phone ?? "Sin teléfono"} · {c.email ?? "Sin email"}
                </p>
              </button>
            ))}
          </div>
          {selectedClient ? (
            <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/75 px-3 py-2.5 text-xs text-emerald-900">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-semibold">Cliente seleccionado</p>
                {loadingClientDetail ? <span className="text-[10px] text-emerald-700">Cargando ficha…</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] leading-tight">
                <p>
                  <span className="font-semibold">Nombre:</span> {selectedClient.fullName}
                </p>
                <p>
                  <span className="font-semibold">Código:</span> {selectedClient.clientCode ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">Teléfono:</span> {selectedClient.phone ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">Email:</span> {selectedClient.email ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">Origen:</span>{" "}
                  {selectedClient.origenCliente === "internet"
                    ? "Internet"
                    : selectedClient.origenCliente === "fisico"
                      ? "Físico"
                      : "—"}
                </p>
                <p>
                  <span className="font-semibold">Estado pago:</span> {selectedClient.estadoPago ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">RGPD:</span>{" "}
                  {selectedClient.rgpdConsentAt
                    ? `${formatClientDate(selectedClient.rgpdConsentAt)}${selectedClient.rgpdConsentVersion ? ` (${selectedClient.rgpdConsentVersion})` : ""}`
                    : "Pendiente"}
                </p>
                <p>
                  <span className="font-semibold">Lead contactado:</span>{" "}
                  {selectedClient.leadContactedAt ? formatClientDate(selectedClient.leadContactedAt) : "—"}
                </p>
                <p>
                  <span className="font-semibold">Bono sesiones:</span>{" "}
                  {selectedClient.bonoRemainingSessions ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">Bono caduca:</span>{" "}
                  {formatClientDate(selectedClient.bonoExpiresAt)}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold">Alta:</span> {formatClientDate(selectedClient.createdAt)}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold">Notas:</span> {selectedClient.notes?.trim() || "—"}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="glass-inner relative rounded-2xl border border-white/70 bg-gradient-to-b from-white/90 to-blue-50/45 p-4 shadow-[0_16px_28px_-22px_rgba(30,64,175,0.55)] ring-1 ring-blue-100/60 xl:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Producto</p>
          <label className="mt-1.5 block text-sm font-medium text-slate-700">Buscar y añadir productos</label>
          <input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blue-100/90 bg-white/95 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Escribe nombre o código..."
          />
          <div className="mt-2 max-h-24 space-y-1 overflow-auto pr-0.5">
            {products.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleProduct(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleProduct(p.id);
                  }
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left text-xs transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/80"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{p.name}</span>
                <div className="ml-2 inline-flex items-center gap-1.5">
                  <span className="text-slate-500">{formatEuroEsTwoDecimals(p.priceEuros)}</span>
                  <button
                    type="button"
                    title={p.isFavorite ? "Quitar favorito" : "Guardar como favorito"}
                    aria-label={p.isFavorite ? "Quitar favorito" : "Guardar como favorito"}
                    disabled={favoriteSavingIds.includes(p.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      void setProductFavorite(p.id, !p.isFavorite);
                    }}
                    className={`inline-flex rounded-md p-1 transition ${
                      p.isFavorite
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-slate-400 hover:bg-slate-100 hover:text-amber-500"
                    } disabled:opacity-40`}
                  >
                    <Star className={`h-4 w-4 ${p.isFavorite ? "fill-current" : ""}`} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Favoritos (6)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {favorites.slice(0, 6).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/60"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(f.id)}
                  onChange={() => toggleProduct(f.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
                <button
                  type="button"
                  title="Quitar favorito"
                  aria-label={`Quitar favorito ${f.name}`}
                  disabled={favoriteSavingIds.includes(f.id)}
                  onClick={() => void setProductFavorite(f.id, false)}
                  className="inline-flex rounded-md p-1 text-amber-500 transition hover:bg-amber-50 disabled:opacity-40"
                >
                  <Star className="h-4 w-4 fill-current" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-inner relative rounded-2xl border border-white/70 bg-gradient-to-b from-white/95 to-cyan-50/55 p-4 shadow-[0_16px_28px_-22px_rgba(30,64,175,0.55)] ring-1 ring-blue-100/60 xl:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Importe y pago</p>
          <label className="mt-1.5 block text-sm font-medium text-slate-700">Importe manual (€)</label>
          <input
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blue-100/90 bg-white/95 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="0,00"
            inputMode="decimal"
          />
          <p className="mt-2.5 text-sm font-medium text-slate-700">Forma de pago</p>
          <div className="mt-2 grid gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/70">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              Efectivo
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/70">
              <input
                type="radio"
                name="payment-method"
                checked={paymentMethod === "bizum"}
                onChange={() => setPaymentMethod("bizum")}
              />
              Bizum
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm transition hover:-translate-y-[1px] hover:border-blue-300/70 hover:bg-blue-50/70">
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
            className="mt-3 w-full rounded-xl border border-white/40 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_-14px_rgba(37,99,235,0.9)] transition hover:brightness-105 disabled:opacity-45"
          >
            {saving ? "Grabando ticket..." : "Grabar y generar recibo"}
          </Button>
        </div>
      </div>

      {selectedProducts.length > 0 ? (
        <div className="glass-inner mt-4 rounded-2xl border border-white/65 bg-gradient-to-r from-white/85 to-blue-50/60 p-4 ring-1 ring-blue-100/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen productos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-blue-200/80 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1 text-xs font-medium text-blue-800"
              >
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
        <div className="glass-inner mt-4 rounded-2xl border border-white/65 bg-gradient-to-r from-white/85 to-cyan-50/45 p-5 shadow-inner ring-1 ring-blue-100/60">
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

      {clientModalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cash-create-client-title"
          onClick={() => {
            if (!creatingClient) setClientModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 id="cash-create-client-title" className="text-base font-semibold text-slate-900">
                  Nuevo cliente
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Alta rápida desde caja. Luego podrás completar la ficha en Clientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClientModalOpen(false)}
                disabled={creatingClient}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
                <input
                  value={createClientName}
                  onChange={(e) => setCreateClientName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Nombre y apellidos"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                  <input
                    value={createClientPhone}
                    onChange={(e) => setCreateClientPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    value={createClientEmail}
                    onChange={(e) => setCreateClientEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                <textarea
                  value={createClientNotes}
                  onChange={(e) => setCreateClientNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Opcional"
                />
              </div>
            </div>

            {clientModalError ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {clientModalError}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClientModalOpen(false)}
                disabled={creatingClient}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={() => void handleCreateClient()}
                disabled={creatingClient}
              >
                {creatingClient ? "Guardando…" : "Crear cliente"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
