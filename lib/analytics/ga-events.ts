import { getGaMeasurementId, getGtmId } from "@/lib/analytics/ga-id";
import { getStoredCookieConsent } from "@/lib/cookie-consent";

/**
 * Evento (dataLayer via gtag); con GTM o con GA4 directo, si hay gtag y consentimiento de analítica.
 * P. ej. al enviar formulario, completar reserva, etc. En GTM, crea una etiqueta que escuche el evento.
 */
export function trackGaEvent(name: string, params?: Record<string, string | number | boolean | undefined>) {
  if ((!getGtmId() && !getGaMeasurementId()) || typeof window === "undefined") return;
  const c = getStoredCookieConsent();
  if (!c?.analytics) return;
  window.gtag?.("event", name, params);
}
