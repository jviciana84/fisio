import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signSessionToken } from "@/lib/sessions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const challengeCookieName = "pin_challenge";
const sessionCookieName = "staff_session";
const onboardingCookieName = "totp_onboarding";

type StaffAccessRow = {
  id: string;
  role: string;
  pin_hash: string;
  pin_salt: string;
  requires_2fa: boolean;
  totp_secret: string | null;
  totp_onboarding_complete: boolean;
  is_active: boolean;
};

type PinRequestBody = {
  pin: string;
};

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function compareHash(expected: string, received: string) {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    if (!env.AUTH_CHALLENGE_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Configuracion incompleta de autenticacion" },
        { status: 500 },
      );
    }

    const { pin } = (await request.json()) as PinRequestBody;
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { ok: false, message: "PIN invalido" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_access")
      .select(
        "id, role, pin_hash, pin_salt, requires_2fa, totp_secret, totp_onboarding_complete, is_active",
      )
      .eq("is_active", true);

    if (error) {
      return NextResponse.json(
        { ok: false, message: "No se pudo validar el acceso" },
        { status: 500 },
      );
    }

    const match = (data as StaffAccessRow[]).find((entry) => {
      const currentHash = hashPin(pin, entry.pin_salt);
      return compareHash(entry.pin_hash, currentHash);
    });

    if (!match) {
      return NextResponse.json(
        { ok: false, message: "PIN incorrecto" },
        { status: 401 },
      );
    }

    const cookieStore = await cookies();

    const needsTotpOnboarding =
      match.requires_2fa &&
      match.role === "admin" &&
      match.totp_onboarding_complete === false &&
      Boolean(match.totp_secret);

    if (needsTotpOnboarding) {
      cookieStore.delete(challengeCookieName);
      const onboardingToken = await signSessionToken(
        {
          userId: match.id,
          role: match.role,
          purpose: "totp_onboarding",
        },
        env.AUTH_CHALLENGE_SECRET,
        "15m",
      );

      cookieStore.set(onboardingCookieName, onboardingToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15,
        path: "/",
      });

      return NextResponse.json({
        ok: true,
        requiresTotpOnboarding: true,
        redirectTo: "/onboarding/totp",
      });
    }

    if (match.requires_2fa) {
      cookieStore.delete(onboardingCookieName);
      const challengeToken = await signSessionToken(
        { userId: match.id, role: match.role },
        env.AUTH_CHALLENGE_SECRET,
        "5m",
      );

      cookieStore.set(challengeCookieName, challengeToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 5,
        path: "/",
      });

      return NextResponse.json({ ok: true, requiresTwoFactor: true });
    }

    const sessionToken = await signSessionToken(
      { userId: match.id, role: match.role },
      env.AUTH_CHALLENGE_SECRET,
      "8h",
    );

    cookieStore.set(sessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    cookieStore.delete(challengeCookieName);
    cookieStore.delete(onboardingCookieName);

    return NextResponse.json({
      ok: true,
      requiresTwoFactor: false,
      redirectTo: "/dashboard",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Solicitud invalida" },
      { status: 400 },
    );
  }
}
