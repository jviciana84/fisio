/**
 * Contenedor de Google Tag Manager (p. ej. GTM-XXXXXXX; distinto de G- que es medición GA4). Si GTM está definido,
 * tiene prioridad sobre la carga directa de gtag/GA4.
 */
export function getGtmId(): string {
  return (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();
}

/** ID de medición GA4 (G-XXXXXXXX). Solo se usa si no hay `NEXT_PUBLIC_GTM_ID`. */
export function getGaMeasurementId(): string {
  return (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
}
