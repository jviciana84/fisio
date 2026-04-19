export const STAFF_HOURLY_TARIFF_SLOTS = 6;

export type HourlyTariffSlot = {
  label: string;
  cents_per_hour: number;
};

/** Rellena a 6 huecos para el formulario (desde JSON o vacío). */
export function padHourlyTariffs(raw: unknown): HourlyTariffSlot[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: HourlyTariffSlot[] = [];
  for (let i = 0; i < STAFF_HOURLY_TARIFF_SLOTS; i++) {
    const s = arr[i] as { label?: unknown; cents_per_hour?: unknown } | undefined;
    const label = typeof s?.label === "string" ? s.label : "";
    const cents = Number(s?.cents_per_hour);
    out.push({
      label,
      cents_per_hour:
        Number.isFinite(cents) && cents >= 0 ? Math.round(Math.min(cents, 99_999_999)) : 0,
    });
  }
  return out;
}

/** Persistencia: solo entradas con texto o importe; máx. 6. */
export function sanitizeHourlyTariffsForDb(slots: HourlyTariffSlot[]): HourlyTariffSlot[] {
  const out: HourlyTariffSlot[] = [];
  for (const s of slots.slice(0, STAFF_HOURLY_TARIFF_SLOTS)) {
    const label = s.label.trim();
    const cents = Math.round(Number(s.cents_per_hour));
    const c = Number.isFinite(cents) && cents >= 0 ? Math.min(cents, 99_999_999) : 0;
    if (label === "" && c <= 0) continue;
    out.push({ label: label || "Tarifa", cents_per_hour: c });
  }
  return out.slice(0, STAFF_HOURLY_TARIFF_SLOTS);
}
