export const STAFF_HOURLY_TARIFF_SLOTS = 6;
/** Índices 0–2: €/h; índices 3–5: % sobre venta (centésimas, p. ej. 2500 = 25,00 %). */
export const STAFF_HOURLY_EURO_SLOT_COUNT = 3;

export type TariffKind = "hourly" | "percentage";

export type HourlyTariffSlot = {
  label: string;
  kind: TariffKind;
  cents_per_hour: number;
  /** Centésimas de punto porcentual: 2500 = 25,00 % (0–10000). */
  percent_hundredths: number;
};

export function isPercentageSlotIndex(idx: number): boolean {
  return idx >= STAFF_HOURLY_EURO_SLOT_COUNT;
}

/**
 * Rellena a 6 huecos. Por índice: 0–2 siempre €/h; 3–5 siempre % (ignora kind incoherente en JSON antiguo).
 */
export function padHourlyTariffs(raw: unknown): HourlyTariffSlot[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: HourlyTariffSlot[] = [];
  for (let i = 0; i < STAFF_HOURLY_TARIFF_SLOTS; i++) {
    const s = arr[i] as {
      label?: unknown;
      kind?: unknown;
      cents_per_hour?: unknown;
      percent_hundredths?: unknown;
    } | undefined;
    const label = typeof s?.label === "string" ? s.label : "";
    if (isPercentageSlotIndex(i)) {
      const ph = Math.round(Number(s?.percent_hundredths));
      const pct = Number.isFinite(ph) ? Math.max(0, Math.min(10_000, ph)) : 0;
      out.push({
        label,
        kind: "percentage",
        cents_per_hour: 0,
        percent_hundredths: pct,
      });
    } else {
      const cents = Number(s?.cents_per_hour);
      const c =
        Number.isFinite(cents) && cents >= 0 ? Math.round(Math.min(cents, 99_999_999)) : 0;
      out.push({
        label,
        kind: "hourly",
        cents_per_hour: c,
        percent_hundredths: 0,
      });
    }
  }
  return out;
}

/** Persistencia: solo entradas con texto o importe; máx. 6. */
export function sanitizeHourlyTariffsForDb(slots: HourlyTariffSlot[]): HourlyTariffSlot[] {
  const out: HourlyTariffSlot[] = [];
  for (const s of slots.slice(0, STAFF_HOURLY_TARIFF_SLOTS)) {
    const label = s.label.trim();
    if (s.kind === "percentage") {
      const ph = Math.round(Number(s.percent_hundredths));
      const p = Number.isFinite(ph) ? Math.max(0, Math.min(10_000, ph)) : 0;
      if (label === "" && p <= 0) continue;
      out.push({
        label: label || "Tarifa",
        kind: "percentage",
        cents_per_hour: 0,
        percent_hundredths: p,
      });
    } else {
      const cents = Math.round(Number(s.cents_per_hour));
      const c = Number.isFinite(cents) && cents >= 0 ? Math.min(cents, 99_999_999) : 0;
      if (label === "" && c <= 0) continue;
      out.push({
        label: label || "Tarifa",
        kind: "hourly",
        cents_per_hour: c,
        percent_hundredths: 0,
      });
    }
  }
  return out.slice(0, STAFF_HOURLY_TARIFF_SLOTS);
}

export function tariffSlotHasPositiveValue(s: HourlyTariffSlot): boolean {
  if (s.kind === "percentage") return s.percent_hundredths > 0;
  return s.cents_per_hour > 0;
}
