import { verify } from "otplib";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signSessionToken, verifySessionToken } from "@/lib/sessions";
import type { StaffSessionPayload } from "@/lib/sessions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const onboardingCookieName = "totp_onboarding";
const sessionCookieName = "staff_session";

type Body = { code: string };

type OnboardingPayload = StaffSessionPayload & { purpose?: string };

export async function POST(request: Request) {
  try {
    if (!env.AUTH_CHALLENGE_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Configuración incompleta de autenticación" },
        { status: 500 },
      );
    }

    const { code } = (await request.json()) as Body;
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, message: "Código TOTP inválido" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const raw = cookieStore.get(onboardingCookieName)?.value;
    if (!raw) {
      return NextResponse.json(
        { ok: false, message: "Sesión de configuración caducada. Vuelve a iniciar sesión." },
        { status: 401 },
      );
    }

    const payload = await verifySessionToken<OnboardingPayload>(
      raw,
      env.AUTH_CHALLENGE_SECRET,
    );

    if (payload.purpose !== "totp_onboarding") {
      return NextResponse.json({ ok: false, message: "Sesión inválida" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_access")
      .select("id, role, totp_secret, totp_onboarding_complete, is_active")
      .eq("id", payload.userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "No se pudo validar el usuario" },
        { status: 401 },
      );
    }

    if (data.totp_onboarding_complete) {
      return NextResponse.json(
        { ok: false, message: "La configuración ya estaba completada" },
        { status: 400 },
      );
    }

    const verification = data.totp_secret
      ? await verify({
          secret: data.totp_secret,
          token: code,
          strategy: "totp",
        })
      : { valid: false };

    if (!verification.valid) {
      return NextResponse.json(
        { ok: false, message: "Código incorrecto" },
        { status: 401 },
      );
    }

    const { error: upError } = await supabase
      .from("staff_access")
      .update({ totp_onboarding_complete: true })
      .eq("id", data.id);

    if (upError) {
      return NextResponse.json(
        { ok: false, message: "No se pudo guardar el progreso" },
        { status: 500 },
      );
    }

    const sessionToken = await signSessionToken(
      { userId: data.id, role: data.role },
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
    cookieStore.delete(onboardingCookieName);

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo completar la configuración" },
      { status: 400 },
    );
  }
}
