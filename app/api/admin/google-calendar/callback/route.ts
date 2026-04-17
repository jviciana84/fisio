import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAppBaseUrlFromRequest } from "@/lib/app-base-url";
import { env } from "@/lib/env";
import { saveGoogleOAuthTokens } from "@/lib/google/integration-db";
import { getGoogleOAuthRedirectUri } from "@/lib/google/oauth-config";
import { verifyGoogleOAuthState } from "@/lib/google/oauth-state";
import { encryptSecret, getGoogleTokenSecret } from "@/lib/google/token-crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = getAppBaseUrlFromRequest(request);
  const calUrl = `${base}/dashboard/configuracion/calendario`;

  const secret = env.AUTH_CHALLENGE_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("auth_config")}`);
  }

  const tokenSecret = getGoogleTokenSecret();
  if (!tokenSecret) {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("token_secret")}`);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("google_env")}`);
  }

  const url = new URL(request.url);
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent(err)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("missing_code")}`);
  }

  try {
    await verifyGoogleOAuthState(state, secret);
  } catch {
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("bad_state")}`);
  }

  const redirectUri = getGoogleOAuthRedirectUri();
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );

  let tokens: { refresh_token?: string | null; access_token?: string | null };
  try {
    const t = await oauth2Client.getToken(code);
    tokens = t.tokens;
  } catch (e) {
    console.error("[google-calendar] getToken falló (revisa redirect_uri vs Google Console):", e);
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("token_exchange")}`);
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      `${calUrl}?error=${encodeURIComponent("no_refresh_token")}`,
    );
  }

  oauth2Client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (r.ok) {
      const profile = (await r.json()) as { email?: string };
      email = profile.email?.trim() || null;
    }
  } catch {
    /* email opcional */
  }

  const enc = encryptSecret(tokens.refresh_token, tokenSecret);
  const ok = await saveGoogleOAuthTokens(enc, email);
  if (!ok) {
    console.error(
      "[google-calendar] saveGoogleOAuthTokens falló (¿tabla google_calendar_integration en Supabase? ¿SERVICE_ROLE_KEY en Vercel?)",
    );
    return NextResponse.redirect(`${calUrl}?error=${encodeURIComponent("db_save")}`);
  }

  return NextResponse.redirect(`${calUrl}?connected=1`);
}
