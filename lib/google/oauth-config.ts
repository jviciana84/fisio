import { env } from "@/lib/env";

/** URI exacta que debe coincidir con la configurada en Google Cloud Console. */
export function getGoogleOAuthRedirectUri(): string {
  if (env.GOOGLE_OAUTH_REDIRECT_URI) return env.GOOGLE_OAUTH_REDIRECT_URI;
  if (env.NEXT_PUBLIC_APP_URL) {
    return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/admin/google-calendar/callback`;
  }
  return "http://localhost:3000/api/admin/google-calendar/callback";
}

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;
