import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { sanitizeHourlyTariffsForDb, type HourlyTariffSlot } from "@/lib/staff-hourly-tariffs";
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
    let role: "admin" | "staff" = "staff";
    let newPin = "";
    let avatarFile: File | null = null;

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

    const tariffsJson = sanitizeHourlyTariffsForDb(hourlyTariffs);

    if (newPin && !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { ok: false, message: "El PIN nuevo debe tener exactamente 4 dígitos" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const pinSalt = newPin ? randomBytes(16).toString("hex") : null;
    const pinHash = newPin && pinSalt ? hashPin(newPin, pinSalt) : null;

    const { error: updErr } = await supabase
      .from("staff_access")
      .update({
        full_name: fullName,
        email,
        phone,
        role,
        public_profile: publicProfile,
        public_specialty: publicProfile ? publicSpecialty : null,
        public_bio: publicProfile ? publicBio : null,
        hourly_tariffs: tariffsJson,
        ...(publicProfile ? {} : { public_avatar_path: null }),
        ...(pinHash && pinSalt ? { pin_hash: pinHash, pin_salt: pinSalt } : {}),
      })
      .eq("id", id)
      .eq("is_active", true);

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
              "Falta la migración de tarifas (hourly_tariffs). Aplica la migración 019 en Supabase.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: false, message: "No se pudo guardar" }, { status: 500 });
    }

    let avatarWarning: string | undefined;
    if (avatarFile && publicProfile) {
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

    return NextResponse.json({
      ok: true,
      ...(avatarWarning ? { avatarWarning } : {}),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
