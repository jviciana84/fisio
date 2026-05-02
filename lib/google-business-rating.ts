import { cache } from "react"

/**
 * Valoración mostrada en el hero y JSON-LD.
 *
 * Orden de prioridad:
 * 1. **Manual** — si defines `SITE_GOOGLE_RATING` (y opcional `SITE_GOOGLE_REVIEW_COUNT`): **prevalece** sobre la API (útil para fijar 4.3 ya y quitar después).
 * 2. Google Places API — se cachea en servidor (`GOOGLE_BUSINESS_RATING_CACHE_SEC`; por defecto ~3 h) con `GOOGLE_MAPS_API_KEY` + `GOOGLE_BUSINESS_PLACE_ID`.
 * 3. Fallback del código (4.3, sin recuento) si no hay manual ni API o la petición falla.
 *
 * Los datos públicos de Google pueden tardar en la API más que en Maps; revisa también clave, quotas y billing.
 */

/** Segundos de caché de la llamada Places (homepage + layout la comparten); configurable con env por si necesitas menos carga API. */
const PLACES_DETAIL_REVALIDATE_SEC = Math.max(
  300,
  Math.min(
    86_400,
    Number.parseInt(process.env.GOOGLE_BUSINESS_RATING_CACHE_SEC?.trim() ?? "", 10) || 10_800,
  ),
)
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
    const res = await fetch(url, { next: { revalidate: PLACES_DETAIL_REVALIDATE_SEC } })
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

const DEFAULT_RATING = 4.3

async function resolveBusinessRating(): Promise<GoogleBusinessRating> {
  const manual = parseManualFromEnv()
  if (manual) return manual

  const fromApi = await fetchFromPlacesApi()
  if (fromApi) {
    return {
      rating: fromApi.rating,
      userRatingsTotal: fromApi.userRatingsTotal,
      source: "google_api",
    }
  }

  return {
    rating: DEFAULT_RATING,
    userRatingsTotal: null,
    source: "default",
  }
}

/** Una sola resolución por petición (layout + página comparten resultado). */
export const getGoogleBusinessRating = cache(resolveBusinessRating)
