import { verify } from "otplib";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signSessionToken, verifySessionToken } from "@/lib/sessions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const challengeCookieName = "pin_challenge";
const sessionCookieName = "staff_session";

type TotpBody = {
  code: string;
};

type ChallengePayload = {
  userId: string;
  role: string;
};

type StaffTotpRow = {
  id: string;
  role: string;
  totp_secret: string | null;
  is_active: boolean;
};

export async function POST(request: Request) {
  try {
    if (!env.AUTH_CHALLENGE_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Configuracion incompleta de autenticacion" },
        { status: 500 },
      );
    }

    const { code } = (await request.json()) as TotpBody;
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, message: "Codigo TOTP invalido" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const challenge = cookieStore.get(challengeCookieName)?.value;
    if (!challenge) {
      return NextResponse.json(
        { ok: false, message: "Sesion de desafio expirada" },
        { status: 401 },
      );
    }

    const payload = await verifySessionToken<ChallengePayload>(
      challenge,
      env.AUTH_CHALLENGE_SECRET,
    );

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_access")
      .select("id, role, totp_secret, is_active")
      .eq("id", payload.userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "No se pudo validar el segundo factor" },
        { status: 401 },
      );
    }

    const record = data as StaffTotpRow;
    const verification = record.totp_secret
      ? await verify({
          secret: record.totp_secret,
          token: code,
          strategy: "totp",
        })
      : { valid: false };

    if (!verification.valid) {
      return NextResponse.json(
        { ok: false, message: "Codigo incorrecto" },
        { status: 401 },
      );
    }

    const sessionToken = await signSessionToken(
      { userId: record.id, role: record.role },
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

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo verificar TOTP" },
      { status: 401 },
    );
  }
}
