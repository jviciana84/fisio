import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  MAX_MONTHLY_SALARY_CENTS,
  normalizeCompensationType,
  parseEuroStringToCents,
} from "@/lib/staff-compensation";
import {
  padHourlyTariffs,
  sanitizeHourlyTariffsForDb,
  tariffSlotHasPositiveValue,
  type HourlyTariffSlot,
} from "@/lib/staff-hourly-tariffs";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STAFF_PUBLIC_BUCKET = "staff-public";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function parseDateOnly(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return raw;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, message: "ID inválido" }, { status: 400 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let fullName: string;
    let email: string;
    let phone: string;
    let publicProfile: boolean;
    let publicSpecialty: string | null;
    let publicBio: string | null;
    let hourlyTariffs: HourlyTariffSlot[];
    let compensationType: ReturnType<typeof normalizeCompensationType> = "self_employed";
    let monthlySalaryRaw = "";
    let role: "admin" | "staff" = "staff";
    let newPin = "";
    let avatarFile: File | null = null;
    let isActive = true;
    let employmentStartDate: string | null = null;
    let employmentEndDate: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      const av = fd.get("avatar");
      avatarFile = av instanceof File && av.size > 0 ? av : null;
      fullName = String(fd.get("fullName") ?? "").trim();
      email = String(fd.get("email") ?? "").trim().toLowerCase();
      phone = String(fd.get("phone") ?? "").trim();
      publicProfile = !["0", "false"].includes(String(fd.get("publicProfile") ?? "1"));
      publicSpecialty = String(fd.get("publicSpecialty") ?? "").trim() || null;
      publicBio = String(fd.get("publicBio") ?? "").trim() || null;
      {
        const r = String(fd.get("role") ?? "staff").trim().toLowerCase();
        role = r === "admin" ? "admin" : "staff";
      }
      newPin = String(fd.get("newPin") ?? "").trim();
      const rawTariffs = fd.get("hourlyTariffs");
      let parsed: unknown = [];
      if (typeof rawTariffs === "string" && rawTariffs.trim()) {
        try {
          parsed = JSON.parse(rawTariffs) as unknown;
        } catch {
          return NextResponse.json({ ok: false, message: "Tarifas inválidas" }, { status: 400 });
        }
      }
      hourlyTariffs = Array.isArray(parsed)
        ? (parsed as HourlyTariffSlot[])
        : [];
      compensationType = normalizeCompensationType(fd.get("compensationType"));
      monthlySalaryRaw = String(fd.get("monthlySalary") ?? "").trim();
      isActive = !["0", "false"].includes(String(fd.get("isActive") ?? "1"));
      employmentStartDate = parseDateOnly(String(fd.get("employmentStartDate") ?? ""));
      employmentEndDate = parseDateOnly(String(fd.get("employmentEndDate") ?? ""));
    } else {
      const j = (await request.json()) as {
        fullName?: string;
        email?: string;
        phone?: string;
        publicProfile?: boolean;
        publicSpecialty?: string | null;
        publicBio?: string | null;
        hourlyTariffs?: HourlyTariffSlot[];
        role?: string;
        newPin?: string;
        compensationType?: string;
        monthlySalary?: string;
        isActive?: boolean;
        employmentStartDate?: string | null;
        employmentEndDate?: string | null;
      };
      fullName = j.fullName?.trim() ?? "";
      email = j.email?.trim().toLowerCase() ?? "";
      phone = j.phone?.trim() ?? "";
      publicProfile = j.publicProfile !== false;
      publicSpecialty = j.publicSpecialty?.trim() || null;
      publicBio = j.publicBio?.trim() || null;
      hourlyTariffs = Array.isArray(j.hourlyTariffs) ? j.hourlyTariffs : [];
      {
        const r = String(j.role ?? "staff").trim().toLowerCase();
        role = r === "admin" ? "admin" : "staff";
      }
      newPin = String(j.newPin ?? "").trim();
      compensationType = normalizeCompensationType(j.compensationType);
      monthlySalaryRaw = String(j.monthlySalary ?? "").trim();
      isActive = j.isActive !== false;
      employmentStartDate = parseDateOnly(j.employmentStartDate ?? "");
      employmentEndDate = parseDateOnly(j.employmentEndDate ?? "");
    }
    if (!employmentStartDate) {
      return NextResponse.json(
        { ok: false, message: "La fecha de alta es obligatoria y debe tener formato válido." },
        { status: 400 },
      );
    }
    if (employmentEndDate && employmentEndDate < employmentStartDate) {
      return NextResponse.json(
        { ok: false, message: "La fecha de baja no puede ser anterior a la fecha de alta." },
        { status: 400 },
      );
    }


    if (!fullName) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, message: "Email no válido" }, { status: 400 });
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      return NextResponse.json(
        { ok: false, message: "Teléfono: entre 9 y 15 dígitos" },
        { status: 400 },
      );
    }

    let tariffsJson: HourlyTariffSlot[];
    let monthly_salary_cents: number | null = null;

    if (compensationType === "salaried") {
      const cents = parseEuroStringToCents(monthlySalaryRaw);
      if (cents === null || cents <= 0 || cents > MAX_MONTHLY_SALARY_CENTS) {
        return NextResponse.json(
          { ok: false, message: "Indica un salario bruto anual válido (mayor que 0)." },
          { status: 400 },
        );
      }
      monthly_salary_cents = cents;
      tariffsJson = sanitizeHourlyTariffsForDb([]);
    } else {
      tariffsJson = sanitizeHourlyTariffsForDb(
        padHourlyTariffs(Array.isArray(hourlyTariffs) ? hourlyTariffs : []),
      );
      if (tariffsJson.length === 0 || !tariffsJson.some((t) => tariffSlotHasPositiveValue(t))) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "En modo autónomo indica al menos una tarifa: €/h o porcentaje sobre venta mayor que 0.",
          },
          { status: 400 },
        );
      }
    }

    if (newPin && !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { ok: false, message: "El PIN nuevo debe tener exactamente 4 dígitos" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: currentStaff } = await supabase
      .from("staff_access")
      .select("is_active, employment_start_date, employment_end_date, monthly_salary_cents")
      .eq("id", id)
      .maybeSingle();

    if (!currentStaff) {
      return NextResponse.json({ ok: false, message: "Usuario no encontrado" }, { status: 404 });
    }

    const pinSalt = newPin ? randomBytes(16).toString("hex") : null;
    const pinHash = newPin && pinSalt ? hashPin(newPin, pinSalt) : null;

    const effectivePublicProfile = isActive ? publicProfile : false;

    const updatePayload: Record<string, unknown> = {
      full_name: fullName,
      email,
      phone,
      role,
      public_profile: effectivePublicProfile,
      public_specialty: effectivePublicProfile ? publicSpecialty : null,
      public_bio: effectivePublicProfile ? publicBio : null,
      hourly_tariffs: tariffsJson,
      compensation_type: compensationType,
      monthly_salary_cents,
      is_active: isActive,
      employment_start_date: employmentStartDate,
      employment_end_date: employmentEndDate,
      ...(effectivePublicProfile ? {} : { public_avatar_path: null }),
      ...(pinHash && pinSalt ? { pin_hash: pinHash, pin_salt: pinSalt } : {}),
    };

    type SaveStrategy = "full" | "no_compensation_columns" | "no_tariff_columns";
    let saveStrategy: SaveStrategy = "full";

    let { error: updErr } = await supabase
      .from("staff_access")
      .update(updatePayload)
      .eq("id", id);

    if (
      updErr &&
      (updErr.code === "42703" ||
        String(updErr.message ?? "").includes("compensation_type") ||
        String(updErr.message ?? "").includes("monthly_salary") ||
        String(updErr.message ?? "").includes("employment_start_date") ||
        String(updErr.message ?? "").includes("employment_end_date"))
    ) {
      const {
        compensation_type: _c,
        monthly_salary_cents: _m,
        employment_start_date: _es,
        employment_end_date: _ee,
        ...rest
      } = updatePayload;
      const retry = await supabase.from("staff_access").update(rest).eq("id", id);
      updErr = retry.error;
      if (!updErr) saveStrategy = "no_compensation_columns";
    }

    if (
      updErr &&
      (updErr.code === "42703" || String(updErr.message ?? "").includes("hourly_tariffs"))
    ) {
      const {
        hourly_tariffs: _h,
        compensation_type: _c2,
        monthly_salary_cents: _m2,
        ...restNoTariffs
      } = updatePayload;
      const retry2 = await supabase.from("staff_access").update(restNoTariffs).eq("id", id);
      updErr = retry2.error;
      if (!updErr) saveStrategy = "no_tariff_columns";
    }

    if (updErr) {
      if (updErr.code === "23505" || updErr.message?.includes("unique")) {
        return NextResponse.json(
          { ok: false, message: "Ya existe otro usuario con ese email" },
          { status: 409 },
        );
      }
      if (updErr.message?.includes("hourly_tariffs") || updErr.code === "42703") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "No se pudieron guardar los datos: falta alguna columna en staff_access (suele ser migración 019 «hourly_tariffs» o 020 «compensation_type» / «monthly_salary_cents»). Comprueba que las migraciones están en el mismo proyecto que usa el .env de esta aplicación.",
            detail: updErr.message ?? null,
            code: updErr.code ?? null,
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { ok: false, message: "No se pudo guardar", detail: updErr.message ?? null, code: updErr.code ?? null },
        { status: 500 },
      );
    }

    const previousActive = Boolean(currentStaff.is_active);
    const nextActive = isActive;
    const nextStartDate = employmentStartDate;
    const nextEndDate = nextActive ? null : employmentEndDate ?? todayIsoDate();

    if (!previousActive && nextActive) {
      await supabase
        .from("staff_employment_periods")
        .insert({
          staff_id: id,
          start_date: nextStartDate,
          end_date: null,
          annual_salary_cents: monthly_salary_cents,
        });
    } else if (previousActive && !nextActive) {
      const { data: openPeriod } = await supabase
        .from("staff_employment_periods")
        .select("id")
        .eq("staff_id", id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openPeriod?.id) {
        await supabase
          .from("staff_employment_periods")
          .update({
            start_date: nextStartDate,
            end_date: nextEndDate,
            annual_salary_cents: monthly_salary_cents,
          })
          .eq("id", openPeriod.id);
      } else {
        await supabase
          .from("staff_employment_periods")
          .insert({
            staff_id: id,
            start_date: nextStartDate,
            end_date: nextEndDate,
            annual_salary_cents: monthly_salary_cents,
          });
      }
    } else if (nextActive) {
      const { data: openPeriod } = await supabase
        .from("staff_employment_periods")
        .select("id")
        .eq("staff_id", id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openPeriod?.id) {
        await supabase
          .from("staff_employment_periods")
          .update({
            start_date: nextStartDate,
            annual_salary_cents: monthly_salary_cents,
          })
          .eq("id", openPeriod.id);
      } else {
        await supabase
          .from("staff_employment_periods")
          .insert({
            staff_id: id,
            start_date: nextStartDate,
            end_date: null,
            annual_salary_cents: monthly_salary_cents,
          });
      }
    }

    let avatarWarning: string | undefined;
    if (avatarFile && effectivePublicProfile) {
      if (avatarFile.size > MAX_AVATAR_BYTES) {
        avatarWarning = "La imagen supera 2 MB; se guardaron el resto de datos sin foto.";
      } else if (!AVATAR_TYPES.has(avatarFile.type)) {
        avatarWarning = "Formato de imagen no permitido.";
      } else {
        try {
          await ensureStaffPublicBucket(supabase);
          const objectPath = `${id}.${extFromMime(avatarFile.type)}`;
          const { error: uploadError } = await supabase.storage
            .from(STAFF_PUBLIC_BUCKET)
            .upload(objectPath, avatarFile, {
              contentType: avatarFile.type,
              upsert: true,
            });
          if (uploadError) {
            avatarWarning = "No se pudo guardar la imagen.";
          } else {
            const { error: pathErr } = await supabase
              .from("staff_access")
              .update({ public_avatar_path: objectPath })
              .eq("id", id);
            if (pathErr) {
              avatarWarning = "Imagen subida pero no se actualizó la referencia.";
            }
          }
        } catch {
          avatarWarning = "No se pudo preparar el almacenamiento para la foto.";
        }
      }
    }

    let migrateNotice: string | undefined;
    if (saveStrategy === "no_compensation_columns") {
      migrateNotice =
        "Se guardó el perfil sin retribución (faltan columnas compensation_type / monthly_salary_cents). Aplica la migración 020 en el proyecto Supabase que usa esta app.";
    } else if (saveStrategy === "no_tariff_columns") {
      migrateNotice =
        "Se guardó solo nombre, contacto y perfil público; no se guardaron tarifas ni retribución (faltan columnas en la base). Aplica las migraciones 019 (hourly_tariffs) y 020 (retribución) en el mismo proyecto Supabase que enlaza NEXT_PUBLIC_SUPABASE_URL / service role.";
    }

    return NextResponse.json({
      ok: true,
      ...(avatarWarning ? { avatarWarning } : {}),
      ...(migrateNotice ? { migrateNotice } : {}),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
