import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signSessionToken } from "@/lib/sessions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Consulta staff activo. Si falla la query con `totp_onboarding_complete`
 * (migración 002 no aplicada u otro error de esquema), reintenta sin esa columna
 * y asume onboarding ya completado para no bloquear el login.
 */
async function fetchActiveStaffRows(
  supabase: SupabaseClient,
): Promise<{ rows: StaffAccessRow[]; fetchError: string | null }> {
  const full = await supabase
    .from("staff_access")
    .select(
      "id, role, pin_hash, pin_salt, requires_2fa, totp_secret, totp_onboarding_complete, is_active",
    )
    .eq("is_active", true);

  if (!full.error && full.data) {
    return { rows: full.data as StaffAccessRow[], fetchError: null };
  }

  const legacy = await supabase
    .from("staff_access")
    .select(
      "id, role, pin_hash, pin_salt, requires_2fa, totp_secret, is_active",
    )
    .eq("is_active", true);

  if (!legacy.error && legacy.data) {
    const rows = (
      legacy.data as Omit<StaffAccessRow, "totp_onboarding_complete">[]
    ).map(
      (r) =>
        ({
          ...r,
          totp_onboarding_complete: true,
        }) as StaffAccessRow,
    );
    return { rows, fetchError: null };
  }

  return {
    rows: [],
    fetchError:
      full.error?.message ??
      legacy.error?.message ??
      "No se pudo leer staff_access",
  };
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
    const { rows, fetchError } = await fetchActiveStaffRows(supabase);

    if (fetchError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            process.env.NODE_ENV === "development"
              ? `No se pudo validar el acceso: ${fetchError}`
              : "No se pudo validar el acceso. Revisa Supabase y ejecuta las migraciones en supabase/migrations/.",
        },
        { status: 500 },
      );
    }

    const match = rows.find((entry) => {
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
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Error desconocido";
    console.error("[api/auth/pin]", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          process.env.NODE_ENV === "development"
            ? detail
            : "No se pudo procesar el inicio de sesión. Inténtalo de nuevo.",
      },
      { status: 500 },
    );
  }
}
