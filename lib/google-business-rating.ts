import { cache } from "react"

/**
 * Valoración mostrada en el hero y JSON-LD.
 *
 * Orden de prioridad:
 * 1. Google Places API (Place Details) — se cachea ~24 h en servidor si configuras clave + Place ID.
 * 2. Valores manuales — sin API ni proyecto Google: `SITE_GOOGLE_RATING` y opcionalmente `SITE_GOOGLE_REVIEW_COUNT`.
 * 3. Valores por defecto del sitio (4.19, sin número de reseñas).
 *
 * La API usa una clave de **desarrollador** (Google Cloud), no el inicio de sesión del negocio en Google Business Profile.
 */
export type GoogleBusinessRating = {
  rating: number
  /** `null` si no se muestra recuento (p. ej. solo texto «reseñas»). */
  userRatingsTotal: number | null
  source: "google_api" | "manual" | "default"
}

async function fetchFromPlacesApi(): Promise<Pick<GoogleBusinessRating, "rating" | "userRatingsTotal"> | null> {
  const placeId = process.env.GOOGLE_BUSINESS_PLACE_ID?.trim()
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (!placeId || !key) return null

  const url =
    "https://maps.googleapis.com/maps/api/place/details/json?" +
    new URLSearchParams({
      place_id: placeId,
      fields: "rating,user_ratings_total",
      key,
    }).toString()

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = (await res.json()) as {
      status: string
      result?: { rating?: number; user_ratings_total?: number }
    }
    if (data.status !== "OK" || typeof data.result?.rating !== "number") return null
    return {
      rating: data.result.rating,
      userRatingsTotal: data.result.user_ratings_total ?? 0,
    }
  } catch {
    return null
  }
}

function parseManualFromEnv(): GoogleBusinessRating | null {
  const raw = process.env.SITE_GOOGLE_RATING?.trim()
  if (!raw) return null
  const rating = Number.parseFloat(raw.replace(",", "."))
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) return null

  const countRaw = process.env.SITE_GOOGLE_REVIEW_COUNT?.trim()
  let userRatingsTotal: number | null = null
  if (countRaw) {
    const n = Number.parseInt(countRaw, 10)
    if (Number.isFinite(n) && n >= 0) userRatingsTotal = n
  }

  return { rating, userRatingsTotal, source: "manual" }
}

const DEFAULT_RATING = 4.19

async function resolveBusinessRating(): Promise<GoogleBusinessRating> {
  const fromApi = await fetchFromPlacesApi()
  if (fromApi) {
    return {
      rating: fromApi.rating,
      userRatingsTotal: fromApi.userRatingsTotal,
      source: "google_api",
    }
  }

  const manual = parseManualFromEnv()
  if (manual) return manual

  return {
    rating: DEFAULT_RATING,
    userRatingsTotal: null,
    source: "default",
  }
}

/** Una sola resolución por petición (layout + página comparten resultado). */
export const getGoogleBusinessRating = cache(resolveBusinessRating)
