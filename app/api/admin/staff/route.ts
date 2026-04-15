import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSecret } from "otplib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Role = "admin" | "staff";

type Body = {
  fullName: string;
  email: string;
  phone: string;
  /** 4 cifras mostradas al abrir el formulario (debe seguir libre en BD). */
  userCode?: string;
  /** @deprecated usar userCode */
  employeeCode?: string;
  pin: string;
  role: Role;
  /** Solo aplica si role es admin: genera TOTP y obliga onboarding en primer acceso. */
  requireAuthenticatorOnFirstLogin?: boolean;
};

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function normalizePhone(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t;
}

/** Código usuario: exactamente 4 dígitos (0000–9999). */
function isClientUserCodeFormat(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();
  try {
    const userCode = await generateUniqueUserCode(supabase);
    return NextResponse.json({ userCode });
  } catch {
    return NextResponse.json(
      { message: "No se pudo generar un código de usuario" },
      { status: 500 },
    );
  }
}

/** Genera un número de 4 cifras único (columna `employee_code` en BD). */
async function generateUniqueUserCode(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const n = Math.floor(Math.random() * 10000);
    const code = String(n).padStart(4, "0");
    const { data } = await supabase
      .from("staff_access")
      .select("id")
      .eq("employee_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  for (let i = 0; i < 10000; i++) {
    const code = String(i).padStart(4, "0");
    const { data } = await supabase
      .from("staff_access")
      .select("id")
      .eq("employee_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("No hay códigos de usuario libres");
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const requestedUserCode = (body.userCode ?? body.employeeCode)?.trim();
    const pin = body.pin;
    const role = body.role;
    const requireAuth = Boolean(body.requireAuthenticatorOnFirstLogin);

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Nombre y email válidos son obligatorios" },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        { ok: false, message: "El teléfono es obligatorio" },
        { status: 400 },
      );
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      return NextResponse.json(
        { ok: false, message: "Teléfono: introduce entre 9 y 15 dígitos" },
        { status: 400 },
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { ok: false, message: "El PIN debe tener 4 dígitos" },
        { status: 400 },
      );
    }

    if (!["admin", "staff"].includes(role)) {
      return NextResponse.json({ ok: false, message: "Rol inválido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    let storedUserCode: string;
    if (requestedUserCode) {
      if (!isClientUserCodeFormat(requestedUserCode)) {
        return NextResponse.json(
          { ok: false, message: "Código de usuario no válido. Recarga la página." },
          { status: 400 },
        );
      }
      const { data: taken } = await supabase
        .from("staff_access")
        .select("id")
        .eq("employee_code", requestedUserCode)
        .maybeSingle();
      if (taken) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Ese código de usuario ya está en uso. Recarga el formulario para obtener otro.",
          },
          { status: 409 },
        );
      }
      storedUserCode = requestedUserCode;
    } else {
      storedUserCode = await generateUniqueUserCode(supabase);
    }

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
        phone,
        employee_code: storedUserCode,
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
          { ok: false, message: "Ya existe un usuario con ese email o código de usuario" },
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
      userCode: storedUserCode,
      requiresFirstLoginTotp: role === "admin" && requireAuth,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
