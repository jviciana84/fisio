/**
 * Formulario web de bonos: si es `true`, se exige lienzo de firma y PNG en el servidor.
 * Por defecto es `false` (solo casilla de consentimiento + datos, flujo más corto).
 *
 * `.env`: `NEXT_PUBLIC_BONOS_WEB_REQUIRE_SIGNATURE=true` para reactivar la firma manuscrita.
 */
export function bonosWebRequireSignature(): boolean {
  return process.env.NEXT_PUBLIC_BONOS_WEB_REQUIRE_SIGNATURE === "true";
}
