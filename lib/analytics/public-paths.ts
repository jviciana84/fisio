/** Rutas de intranet / impresión: sin banner de cookies ni Google Analytics. */
const EXCLUDED_PREFIXES = ["/dashboard", "/login", "/onboarding", "/print/"] as const;

export function isPublicMarketingSurfacePath(path: string | null): boolean {
  if (!path) return false;
  return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}
