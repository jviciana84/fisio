"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Star, X } from "lucide-react";
import { formatEuroEsTwoDecimals } from "@/lib/format-es";
import { DASHBOARD_INPUT_CLASS_FORM } from "@/components/dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import { ClientDetailModal } from "@/components/dashboard/ClientDetailModal";
import { BonoConsumePanel } from "@/components/dashboard/BonoConsumePanel";
import { BonoCardWithToolbar } from "@/components/bonos/BonoPrettyCard";

type Client = {
  id: string;
  clientCode: string | null;
  fullName: string;
  taxId?: string | null;
  address?: string | null;
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
  ticketId: string;
  ticketNumber: string;
  createdAt: string;
  paymentMethod: "cash" | "bizum" | "card";
  clientName: string | null;
  lines: { concept: string; amountEuros: number }[];
  totalEuros: number;
  invoiceId?: string;
  invoiceNumber?: string;
  bonosIssued?: Array<{
    id: string;
    uniqueCode: string;
    productName: string;
    sessionsTotal: number;
    sessionsRemaining: number;
    expiresAt: string;
    qrDataUrl: string | null;
  }>;
  bonoEmailStatus?: "not_sent" | "sent" | "smtp_not_configured" | "failed";
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
  const [createClientFirstName, setCreateClientFirstName] = useState("");
  const [createClientLastName, setCreateClientLastName] = useState("");
  const [createClientEmail, setCreateClientEmail] = useState("");
  const [createClientPhone, setCreateClientPhone] = useState("");
  const [createClientNotes, setCreateClientNotes] = useState("");
  const [createClientWantsInvoice, setCreateClientWantsInvoice] = useState(false);
  const [createClientTaxId, setCreateClientTaxId] = useState("");
  const [createClientStreet, setCreateClientStreet] = useState("");
  const [createClientStreetNumber, setCreateClientStreetNumber] = useState("");
  const [createClientPostalCode, setCreateClientPostalCode] = useState("");
  const [createClientCity, setCreateClientCity] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState<string | null>(null);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [fichaClienteId, setFichaClienteId] = useState<string | null>(null);

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
    const hasOpenModal = clientModalOpen || !!fichaClienteId;
    if (!hasOpenModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (clientModalOpen && !creatingClient) setClientModalOpen(false);
      if (fichaClienteId) setFichaClienteId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clientModalOpen, creatingClient, fichaClienteId]);

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
    setCreateClientFirstName("");
    setCreateClientLastName("");
    setCreateClientEmail("");
    setCreateClientPhone("");
    setCreateClientNotes("");
    setCreateClientWantsInvoice(false);
    setCreateClientTaxId("");
    setCreateClientStreet("");
    setCreateClientStreetNumber("");
    setCreateClientPostalCode("");
    setCreateClientCity("");
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
    const firstName = createClientFirstName.trim();
    const lastName = createClientLastName.trim();
    const phone = createClientPhone.trim();
    const email = createClientEmail.trim();
    const notes = createClientNotes.trim();
    const taxId = createClientTaxId.trim();
    const addressStreet = createClientStreet.trim();
    const addressNumber = createClientStreetNumber.trim();
    const addressPostalCode = createClientPostalCode.trim();
    const addressCity = createClientCity.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (firstName.length < 2 || lastName.length < 2) {
      setClientModalError("Nombre y apellidos son obligatorios.");
      return;
    }
    if (phone.length < 6) {
      setClientModalError("El teléfono es obligatorio.");
      return;
    }
    if (createClientWantsInvoice && (!taxId || !addressStreet || !addressNumber || !addressPostalCode || !addressCity)) {
      setClientModalError("Para solicitar factura debes completar NIF/CIF y toda la dirección.");
      return;
    }
    setCreatingClient(true);
    setClientModalError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          fullName,
          email: email || undefined,
          phone,
          notes: notes || undefined,
          wantsInvoice: createClientWantsInvoice,
          taxId: taxId || undefined,
          addressStreet: addressStreet || undefined,
          addressNumber: addressNumber || undefined,
          addressPostalCode: addressPostalCode || undefined,
          addressCity: addressCity || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || !data.ok || !data.id) {
        setClientModalError(data.message ?? "No se pudo crear el cliente.");
        return;
      }
      const createdClientId = data.id;

      setClientModalOpen(false);
      setClientQuery(fullName);
      setMessage({ type: "ok", text: "Cliente creado correctamente." });
      resetCreateClientForm();
      await loadClientDetail(createdClientId);
      setSelectedClient((prev) =>
        prev
          ? prev
          : {
              id: createdClientId,
              fullName,
              clientCode: null,
              taxId: null,
              address: null,
              email: null,
              phone: null,
            },
      );
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
    setMessage(null);
    const shouldCreateInvoice = wantsInvoice;
    if (shouldCreateInvoice) {
      if (!selectedClient?.id) {
        setMessage({
          type: "err",
          text: "Para facturar debes seleccionar un cliente en la lista.",
        });
        return;
      }
      const taxOk = (selectedClient.taxId ?? "").trim().length > 0;
      const addrOk = (selectedClient.address ?? "").trim().length > 0;
      if (!taxOk || !addrOk) {
        window.alert(
          "Para generar la factura el cliente debe tener NIF/CIF y dirección. Complétalos en la ficha del cliente.",
        );
        setFichaClienteId(selectedClient.id);
        return;
      }
    }
    setSaving(true);
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
      if (!data.receipt.ticketId) {
        setMessage({
          type: "err",
          text: "Ticket grabado, pero falta el identificador interno. Recarga e inténtalo de nuevo.",
        });
        return;
      }

      let nextReceipt: Receipt = data.receipt;

      if (shouldCreateInvoice) {
        const invRes = await fetch("/api/admin/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: data.receipt.ticketId }),
        });
        const invData = (await invRes.json()) as {
          ok?: boolean;
          message?: string;
          invoice?: { id: string; invoiceNumber: string };
        };
        if (!invRes.ok || !invData.ok) {
          setMessage({
            type: "err",
            text:
              `Ticket grabado, pero no se pudo generar la factura: ${invData.message ?? "Error desconocido"}. ` +
              "Puedes crearla luego en Facturas.",
          });
        } else if (invData.invoice) {
          nextReceipt = {
            ...nextReceipt,
            invoiceId: invData.invoice.id,
            invoiceNumber: invData.invoice.invoiceNumber,
          };
          setMessage({ type: "ok", text: "Ticket y factura generados correctamente." });
        } else {
          setMessage({ type: "ok", text: "Ticket grabado. Factura generada; revisa el detalle en Facturas." });
        }
      } else {
        setMessage({ type: "ok", text: "Ticket grabado correctamente." });
      }

      setReceipt(nextReceipt);
      setWantsInvoice(false);
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
                  <span className="font-semibold">NIF / CIF:</span> {selectedClient.taxId?.trim() || "—"}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold">Dirección:</span> {selectedClient.address?.trim() || "—"}
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
          <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-slate-600">
            <input
              type="checkbox"
              checked={wantsInvoice}
              onChange={(e) => setWantsInvoice(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300"
            />
            El cliente quiere factura (se genera al grabar, además del ticket)
          </label>
          <Button
            type="button"
            variant="gradient"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="mt-3 w-full rounded-xl border border-white/40 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_-14px_rgba(37,99,235,0.9)] transition hover:brightness-105 disabled:opacity-45"
          >
            {saving
              ? "Grabando…"
              : wantsInvoice
                ? "Grabar recibo y factura"
                : "Grabar y generar recibo"}
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

      <BonoConsumePanel />

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
          {receipt.invoiceId && receipt.invoiceNumber ? (
            <p className="mt-3 text-sm text-slate-700">
              Factura {receipt.invoiceNumber}{" "}
              <Link
                href={`/dashboard/facturas/${receipt.invoiceId}/imprimir`}
                className="font-semibold text-blue-700 underline decoration-blue-500/30 underline-offset-2 hover:text-blue-800"
              >
                Ver factura
              </Link>
            </p>
          ) : null}
          {receipt.bonosIssued?.length ? (
            <div className="mt-4 min-w-0 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3">
              <p className="text-sm font-semibold text-cyan-900">Bonos emitidos ({receipt.bonosIssued.length})</p>
              <p className="mt-1 text-xs text-cyan-800">
                Email:{" "}
                {receipt.bonoEmailStatus === "sent"
                  ? "enviado a cliente y copia a clínica"
                  : receipt.bonoEmailStatus === "smtp_not_configured"
                    ? "no enviado (SMTP no configurado)"
                    : receipt.bonoEmailStatus === "failed"
                      ? "falló el envío (revisar SMTP)"
                      : "no enviado"}
              </p>
              <div className="mt-3 space-y-4">
                {receipt.bonosIssued.map((bono) => (
                  <BonoCardWithToolbar
                    key={bono.id}
                    bono={{
                      id: bono.id,
                      uniqueCode: bono.uniqueCode,
                      productName: bono.productName,
                      sessionsTotal: bono.sessionsTotal,
                      sessionsRemaining: bono.sessionsRemaining,
                      expiresAt: bono.expiresAt,
                      qrDataUrl: bono.qrDataUrl,
                      clientName: selectedClient?.fullName ?? null,
                      clientEmail: selectedClient?.email ?? null,
                      clientPhone: selectedClient?.phone ?? null,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {fichaClienteId ? (
        <ClientDetailModal
          clientId={fichaClienteId}
          onClose={() => setFichaClienteId(null)}
          onSaved={() => {
            const id = fichaClienteId;
            if (id) void loadClientDetail(id).finally(() => setFichaClienteId(null));
          }}
        />
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
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 id="cash-create-client-title" className="text-lg font-semibold text-slate-900">
                  Nuevo cliente
                </h3>
                <p className="mt-1 text-sm text-slate-600">Datos básicos; luego podrás completar la ficha (bono, RGPD, etc.).</p>
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

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    value={createClientFirstName}
                    onChange={(e) => setCreateClientFirstName(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Apellidos</label>
                  <input
                    value={createClientLastName}
                    onChange={(e) => setCreateClientLastName(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    placeholder="Apellidos"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Teléfono</label>
                  <input
                    value={createClientPhone}
                    onChange={(e) => setCreateClientPhone(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    placeholder="Obligatorio"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-500">(opcional)</span></label>
                  <input
                    value={createClientEmail}
                    onChange={(e) => setCreateClientEmail(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createClientWantsInvoice}
                  onChange={(e) => setCreateClientWantsInvoice(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                />
                Este cliente solicita factura
              </label>
              {createClientWantsInvoice ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">NIF/CIF (obligatorio)</label>
                    <input
                      value={createClientTaxId}
                      onChange={(e) => setCreateClientTaxId(e.target.value)}
                      className={DASHBOARD_INPUT_CLASS_FORM}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Calle (obligatorio)</label>
                    <input
                      value={createClientStreet}
                      onChange={(e) => setCreateClientStreet(e.target.value)}
                      className={DASHBOARD_INPUT_CLASS_FORM}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Nº (obligatorio)</label>
                    <input
                      value={createClientStreetNumber}
                      onChange={(e) => setCreateClientStreetNumber(e.target.value)}
                      className={DASHBOARD_INPUT_CLASS_FORM}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Código postal (obligatorio)</label>
                    <input
                      value={createClientPostalCode}
                      onChange={(e) => setCreateClientPostalCode(e.target.value)}
                      className={DASHBOARD_INPUT_CLASS_FORM}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Población (obligatorio)</label>
                    <input
                      value={createClientCity}
                      onChange={(e) => setCreateClientCity(e.target.value)}
                      className={DASHBOARD_INPUT_CLASS_FORM}
                    />
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas <span className="font-normal text-slate-500">(opcional)</span></label>
                <textarea
                  value={createClientNotes}
                  onChange={(e) => setCreateClientNotes(e.target.value)}
                  rows={2}
                  className={`${DASHBOARD_INPUT_CLASS_FORM} resize-y`}
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
                className="inline-flex items-center gap-1.5"
              >
                <X className="h-4 w-4" aria-hidden />
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={() => void handleCreateClient()}
                disabled={
                  creatingClient ||
                  createClientFirstName.trim().length < 2 ||
                  createClientLastName.trim().length < 2 ||
                  createClientPhone.trim().length < 1
                }
                className="inline-flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" aria-hidden />
                {creatingClient ? "Guardando…" : "Crear cliente"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
