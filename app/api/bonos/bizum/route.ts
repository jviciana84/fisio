import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function required(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const name = required(form.get("name"));
    const lastName = required(form.get("lastName"));
    const email = required(form.get("email"));
    const phone = required(form.get("phone"));
    const address = required(form.get("address"));
    const bonoSessions = required(form.get("bonoSessions"));
    const bonoPrice = required(form.get("bonoPrice"));
    const receipt = form.get("receipt");

    if (!name || !lastName || !email || !phone || !address || !bonoSessions || !bonoPrice) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos obligatorios para validar el pago." },
        { status: 400 },
      );
    }

    if (!(receipt instanceof File) || receipt.size === 0) {
      return NextResponse.json(
        { ok: false, message: "Debes adjuntar un comprobante de pago." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const bucketName = "comprobantes";

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucketName)) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: false,
      });
      if (createBucketError) {
        return NextResponse.json(
          { ok: false, message: "No se pudo crear el bucket de comprobantes." },
          { status: 500 },
        );
      }
    }

    const ext = receipt.name.includes(".") ? receipt.name.split(".").pop() : "jpg";
    const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const path = `${sanitizedEmail}/${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, receipt, {
      contentType: receipt.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json(
        { ok: false, message: "No se pudo subir el comprobante." },
        { status: 500 },
      );
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 60 * 60 * 24 * 30);
    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { ok: false, message: "No se pudo generar el enlace del comprobante." },
        { status: 500 },
      );
    }

    const fullName = `${name} ${lastName}`.trim();
    const { error: upsertError } = await supabase.from("clients").upsert(
      {
        full_name: fullName,
        email: email.toLowerCase(),
        phone,
        notes: `Compra bono ${bonoSessions} sesiones (${bonoPrice} euros). Dirección: ${address}`,
        comprobante_pago_url: signed.signedUrl,
        estado_pago: "pendiente_validacion",
      },
      { onConflict: "email" },
    );
    if (upsertError) {
      return NextResponse.json(
        { ok: false, message: "No se pudo guardar la validación de pago." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo procesar el comprobante." },
      { status: 500 },
    );
  }
}
