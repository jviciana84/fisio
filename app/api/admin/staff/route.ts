import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSecret } from "otplib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  MAX_MONTHLY_SALARY_CENTS,
  normalizeCompensationType,
  parseEuroStringToCents,
} from "@/lib/staff-compensation";
import {
  sanitizeHourlyTariffsForDb,
  type HourlyTariffSlot,
} from "@/lib/staff-hourly-tariffs";

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
  /** 1–2 tarifas €/h (multipart: JSON en `hourlyTariffs`). */
  hourlyTariffs?: HourlyTariffSlot[] | unknown;
  /** `salaried` | `self_employed` (o alias `asalariado`). */
  compensationType?: string;
  /** Salario bruto anual en € (texto), solo si asalariado. */
  monthlySalary?: string;
  employmentStartDate?: string;
};

type StaffInsertedRow = {
  id: string;
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

function parseDateOnly(value: string | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return raw;
}

function parseAltaTariffSlot(item: unknown): HourlyTariffSlot | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const explicit = o.kind === "percentage" ? "percentage" : o.kind === "hourly" ? "hourly" : null;
  if (explicit === "percentage") {
    const ph = Math.round(Number(o.percent_hundredths));
    const p = Number.isFinite(ph) ? Math.max(0, Math.min(10_000, ph)) : 0;
    return { label, kind: "percentage", cents_per_hour: 0, percent_hundredths: p };
  }
  if (explicit === "hourly") {
    const cents = Math.round(Number(o.cents_per_hour));
    const c = Number.isFinite(cents) && cents >= 0 ? cents : 0;
    return { label, kind: "hourly", cents_per_hour: c, percent_hundredths: 0 };
  }
  const phTry = Math.round(Number(o.percent_hundredths));
  if (Number.isFinite(phTry) && phTry > 0) {
    const p = Math.max(0, Math.min(10_000, phTry));
    return { label, kind: "percentage", cents_per_hour: 0, percent_hundredths: p };
  }
  const cents = Math.round(Number(o.cents_per_hour));
  const c = Number.isFinite(cents) && cents >= 0 ? cents : 0;
  return { label, kind: "hourly", cents_per_hour: c, percent_hundredths: 0 };
}

/** 1ª obligatoria (€/h o %); 2ª opcional €/h o %. */
function validateAltaHourlyTariffsData(data: unknown): HourlyTariffSlot[] | null {
  if (!Array.isArray(data) || data.length < 1 || data.length > 2) return null;
  const first = parseAltaTariffSlot(data[0]);
  if (!first || !first.label) return null;
  if (first.kind === "hourly") {
    if (first.cents_per_hour <= 0) return null;
  } else if (first.percent_hundredths <= 0) {
    return null;
  }
  if (data.length === 1) return [first];
  const second = parseAltaTariffSlot(data[1]);
  if (!second || !second.label) return null;
  if (second.kind === "hourly") {
    if (second.cents_per_hour <= 0) return null;
  } else if (second.percent_hundredths <= 0) {
    return null;
  }
  return [first, second];
}

function parseAltaHourlyTariffs(raw: string | null): HourlyTariffSlot[] | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return validateAltaHourlyTariffsData(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
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
      const hourlyTariffsParsed = parseAltaHourlyTariffs(String(fd.get("hourlyTariffs") ?? ""));
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
        hourlyTariffs: hourlyTariffsParsed ?? [],
        compensationType: String(fd.get("compensationType") ?? "self_employed"),
        monthlySalary: String(fd.get("monthlySalary") ?? "").trim(),
        employmentStartDate: String(fd.get("employmentStartDate") ?? "").trim(),
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

    if (publicProfile && !publicBio) {
      return NextResponse.json(
        { ok: false, message: "La bio es obligatoria si el perfil está visible en la web." },
        { status: 400 },
      );
    }

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

    const compensationType = normalizeCompensationType(body.compensationType);
    const employmentStartDate = parseDateOnly(body.employmentStartDate) ?? new Date().toISOString().slice(0, 10);

    let hourly_tariffs: HourlyTariffSlot[];
    let monthly_salary_cents: number | null = null;

    if (compensationType === "self_employed") {
      const tariffPayload = validateAltaHourlyTariffsData(body.hourlyTariffs);
      if (!tariffPayload) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Tarifas autónomo: primera obligatoria (nombre + €/h o % mayor que 0). Segunda opcional: €/h o % sobre venta (mayor que 0).",
          },
          { status: 400 },
        );
      }
      hourly_tariffs = sanitizeHourlyTariffsForDb(tariffPayload);
    } else {
      const cents = parseEuroStringToCents(String(body.monthlySalary ?? ""));
      if (cents === null || cents <= 0 || cents > MAX_MONTHLY_SALARY_CENTS) {
        return NextResponse.json(
          {
            ok: false,
            message: "Indica un salario bruto anual válido (mayor que 0).",
          },
          { status: 400 },
        );
      }
      monthly_salary_cents = cents;
      hourly_tariffs = sanitizeHourlyTariffsForDb([]);
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

    let insertPayload: Record<string, unknown> = {
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
      hourly_tariffs,
      compensation_type: compensationType,
      monthly_salary_cents: monthly_salary_cents,
      employment_start_date: employmentStartDate,
      employment_end_date: null,
    };

    let { data, error } = await supabase
      .from("staff_access")
      .insert(insertPayload)
      .select("id")
      .single<StaffInsertedRow>();

    if (error && error.code === "42703") {
      const msg = String(error.message ?? "");
      if (
        msg.includes("compensation_type") ||
        msg.includes("monthly_salary") ||
        msg.includes("employment_start_date") ||
        msg.includes("employment_end_date")
      ) {
        const {
          compensation_type: _c,
          monthly_salary_cents: _m,
          employment_start_date: _es,
          employment_end_date: _ee,
          ...rest
        } = insertPayload;
        insertPayload = rest;
        const retry = await supabase.from("staff_access").insert(insertPayload).select("id").single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (
      error &&
      (error.code === "42703" || String(error.message ?? "").includes("hourly_tariffs"))
    ) {
      const { hourly_tariffs: _omit, ...rest } = insertPayload;
      insertPayload = rest;
      const retry = await supabase.from("staff_access").insert(insertPayload).select("id").single();
      data = retry.data;
      error = retry.error;
    }

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

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "No se pudo crear el usuario" },
        { status: 500 },
      );
    }

    await supabase.from("staff_employment_periods").insert({
      staff_id: data.id,
      start_date: employmentStartDate,
      end_date: null,
      annual_salary_cents: monthly_salary_cents,
    });

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
