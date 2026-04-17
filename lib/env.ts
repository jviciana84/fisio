function t(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: t(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: t(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: t(process.env.SUPABASE_SERVICE_ROLE_KEY),
  AUTH_CHALLENGE_SECRET: t(process.env.AUTH_CHALLENGE_SECRET),
  /** URL pública del sitio (sin barra final). Ej: https://fisioterapiarocblanc.es o http://localhost:3000 */
  NEXT_PUBLIC_APP_URL: t(process.env.NEXT_PUBLIC_APP_URL),
  GOOGLE_CLIENT_ID: t(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: t(process.env.GOOGLE_CLIENT_SECRET),
  /** Callback OAuth exacto registrado en Google Cloud (opcional si usas NEXT_PUBLIC_APP_URL). */
  GOOGLE_OAUTH_REDIRECT_URI: t(process.env.GOOGLE_OAUTH_REDIRECT_URI),
  /** Secreto para cifrar refresh token; si falta, se usa AUTH_CHALLENGE_SECRET. */
  GOOGLE_OAUTH_TOKEN_SECRET: t(process.env.GOOGLE_OAUTH_TOKEN_SECRET),
};
