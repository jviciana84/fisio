export type CookieConsentCategory = "necessary" | "analytics";

export type CookieConsentValue = {
  necessary: true;
  analytics: boolean;
  /** ISO timestamp cuando el usuario guardó su elección */
  updatedAt: string;
  /** Versión de la política; si cambia, se puede volver a mostrar el aviso */
  policyVersion: number;
};

export const COOKIE_CONSENT_STORAGE_KEY = "frb:cookie-consent";
/** Incrementar si cambia la política de cookies o las categorías (re-mostrar aviso). */
export const COOKIE_CONSENT_POLICY_VERSION = 1;

export const DEFAULT_CONSENT: CookieConsentValue = {
  necessary: true,
  analytics: false,
  updatedAt: "",
  policyVersion: COOKIE_CONSENT_POLICY_VERSION,
};

function parseStored(raw: string | null): CookieConsentValue | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<CookieConsentValue>;
    if (o.necessary !== true || typeof o.analytics !== "boolean") return null;
    return {
      necessary: true,
      analytics: o.analytics,
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
      policyVersion: typeof o.policyVersion === "number" ? o.policyVersion : 1,
    };
  } catch {
    return null;
  }
}

export function getStoredCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  return parseStored(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function hasValidCookieChoice(): boolean {
  const c = getStoredCookieConsent();
  if (!c || !c.updatedAt) return false;
  if (c.policyVersion !== COOKIE_CONSENT_POLICY_VERSION) return false;
  return true;
}

export function saveCookieConsent(choice: "all" | "necessary" | "reject"): CookieConsentValue {
  const value: CookieConsentValue = {
    necessary: true,
    analytics: choice === "all",
    updatedAt: new Date().toISOString(),
    policyVersion: COOKIE_CONSENT_POLICY_VERSION,
  };
  if (typeof window === "undefined") return value;
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent<CookieConsentValue>("frb:cookie-consent-updated", { detail: value }),
  );
  return value;
}

export function clearCookieConsentForSettings(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  }
}

export const COOKIE_CATALOG = [
  {
    id: "necessary" as const,
    name: "Estrictamente necesarias",
    description:
      "Imprescindibles para la seguridad, la carga de la página, recordar su decisión de cookies y, cuando use el formulario o la reserva, el funcionamiento de esas secciones.",
    alwaysOn: true,
    examples: ["Preferencia de cookies (frb:cookie-consent)", "Cookies de sesión o seguridad del alojamiento"],
  },
  {
    id: "analytics" as const,
    name: "Analítica / mejora",
    description:
      "Nos ayudan a entender de forma agregada cómo se usa el sitio (p. ej. visitas) para mejorar el contenido. Solo se activan si las acepta.",
    alwaysOn: false,
    examples: [
      "Con GTM/GA4 y su consentimiento: gtag, _ga, contenedor GTM, según la configuración de tu etiquetado (Google / medición de uso agregada).",
    ],
  },
] as const;
