import { google } from "googleapis";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { env } from "@/lib/env";
import { GOOGLE_CALENDAR_SCOPES, getGoogleOAuthRedirectUri } from "@/lib/google/oauth-config";
import { signGoogleOAuthState } from "@/lib/google/oauth-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const secret = env.AUTH_CHALLENGE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "Configuración incompleta de autenticación" },
      { status: 500 },
    );
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        message: "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor",
      },
      { status: 500 },
    );
  }

  const redirectUri = getGoogleOAuthRedirectUri();
  const state = await signGoogleOAuthState(
    { purpose: "google_calendar_oauth", userId: auth.userId },
    secret,
  );

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_CALENDAR_SCOPES],
    state,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
