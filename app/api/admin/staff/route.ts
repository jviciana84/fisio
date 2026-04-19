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
  userCode?: string;
  employeeCode?: string;
  pin: string;
  role: Role;
  requireAuthenticatorOnFirstLogin?: boolean;
  publicProfile?: boolean;
  publicSpecialty?: string;
  publicBio?: string;
};

const STAFF_PUBLIC_BUCKET = "staff-public";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function normalizePhone(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t;
}

function isClientUserCodeFormat(code: string): boolean {
  return /^\d{4}$/.test(code);
}

function parseTruthy(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return v === "1" || v === "true" || v === "on";
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

async function ensureStaffPublicBucket(supabase: SupabaseClient) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === STAFF_PUBLIC_BUCKET)) return;
  const { error } = await supabase.storage.createBucket(STAFF_PUBLIC_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: [...AVATAR_TYPES],
  });
  if (error) {
    throw new Error(error.message);
  }
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
    const contentType = request.headers.get("content-type") ?? "";
    let body: Body;
    let avatarFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      const av = fd.get("avatar");
      avatarFile = av instanceof File && av.size > 0 ? av : null;
      const roleRaw = String(fd.get("role") ?? "staff");
      const roleParsed: Role = roleRaw === "admin" ? "admin" : "staff";
      body = {
        fullName: String(fd.get("fullName") ?? "").trim(),
        email: String(fd.get("email") ?? "").trim().toLowerCase(),
        phone: String(fd.get("phone") ?? "").trim(),
        userCode: String(fd.get("userCode") ?? "").trim() || undefined,
        pin: String(fd.get("pin") ?? ""),
        role: roleParsed,
        requireAuthenticatorOnFirstLogin: parseTruthy(fd.get("requireAuthenticatorOnFirstLogin")),
        publicProfile: !["0", "false"].includes(String(fd.get("publicProfile") ?? "1")),
        publicSpecialty: String(fd.get("publicSpecialty") ?? "").trim() || undefined,
        publicBio: String(fd.get("publicBio") ?? "").trim() || undefined,
      };
    } else {
      body = (await request.json()) as Body;
    }

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const requestedUserCode = (body.userCode ?? body.employeeCode)?.trim();
    const pin = body.pin;
    const role = body.role;
    const requireAuth = Boolean(body.requireAuthenticatorOnFirstLogin);
    const publicProfile = body.publicProfile !== false;
    const publicSpecialty = publicProfile ? body.publicSpecialty?.trim() || null : null;
    const publicBio = publicProfile ? body.publicBio?.trim() || null : null;

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
        public_profile: publicProfile,
        public_specialty: publicSpecialty,
        public_bio: publicBio,
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

    let avatarWarning: string | undefined;

    if (avatarFile && publicProfile) {
      if (avatarFile.size > MAX_AVATAR_BYTES) {
        avatarWarning = "La imagen supera 2 MB; se creó el usuario sin foto de perfil.";
      } else if (!AVATAR_TYPES.has(avatarFile.type)) {
        avatarWarning = "Formato de imagen no permitido (usa JPG, PNG, WebP o GIF).";
      } else {
        try {
          await ensureStaffPublicBucket(supabase);
          const objectPath = `${data.id}.${extFromMime(avatarFile.type)}`;
          const { error: uploadError } = await supabase.storage
            .from(STAFF_PUBLIC_BUCKET)
            .upload(objectPath, avatarFile, {
              contentType: avatarFile.type,
              upsert: true,
            });
          if (uploadError) {
            avatarWarning = "No se pudo guardar la imagen en el almacenamiento.";
          } else {
            const { error: updErr } = await supabase
              .from("staff_access")
              .update({ public_avatar_path: objectPath })
              .eq("id", data.id);
            if (updErr) {
              avatarWarning = "Imagen subida pero no se pudo guardar la referencia en el usuario.";
            }
          }
        } catch {
          avatarWarning = "No se pudo preparar el almacenamiento para la foto.";
        }
      }
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      userCode: storedUserCode,
      requiresFirstLoginTotp: role === "admin" && requireAuth,
      ...(avatarWarning ? { avatarWarning } : {}),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
