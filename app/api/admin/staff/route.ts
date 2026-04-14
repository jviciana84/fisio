import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSecret } from "otplib";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Role = "admin" | "staff" | "caja";

type Body = {
  fullName: string;
  email: string;
  pin: string;
  role: Role;
  /** Solo aplica si role es admin: genera TOTP y obliga onboarding en primer acceso. */
  requireAuthenticatorOnFirstLogin?: boolean;
};

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const pin = body.pin;
    const role = body.role;
    const requireAuth = Boolean(body.requireAuthenticatorOnFirstLogin);

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Nombre y email válidos son obligatorios" },
        { status: 400 },
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { ok: false, message: "El PIN debe tener 4 dígitos" },
        { status: 400 },
      );
    }

    if (!["admin", "staff", "caja"].includes(role)) {
      return NextResponse.json({ ok: false, message: "Rol inválido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const pinSalt = randomBytes(16).toString("hex");
    const pinHash = hashPin(pin, pinSalt);

    let requires2fa = false;
    let totpSecret: string | null = null;
    let totpOnboardingComplete = true;

    if (role === "admin" && requireAuth) {
      requires2fa = true;
      totpSecret = generateSecret();
      totpOnboardingComplete = false;
    }

    const { data, error } = await supabase
      .from("staff_access")
      .insert({
        full_name: fullName,
        email,
        role,
        pin_hash: pinHash,
        pin_salt: pinSalt,
        requires_2fa: requires2fa,
        totp_secret: totpSecret,
        totp_onboarding_complete: totpOnboardingComplete,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un usuario con ese email" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, message: "No se pudo crear el usuario" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      requiresFirstLoginTotp: role === "admin" && requireAuth,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
