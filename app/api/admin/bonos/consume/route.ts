import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  code?: string;
  source?: "manual" | "qr";
};

type BonoRow = {
  id: string;
  client_id: string;
  product_name: string;
  unique_code: string;
  sessions_total: number;
  sessions_remaining: number;
  expires_at: string;
  is_active: boolean;
  clients:
    | {
        full_name: string;
        email: string | null;
      }
    | {
        full_name: string;
        email: string | null;
      }[]
    | null;
};

function normalizeCode(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    const parsed = JSON.parse(v) as { code?: string };
    if (parsed?.code && typeof parsed.code === "string") return parsed.code.trim();
  } catch {
    // Puede ser texto plano, continuar.
  }
  return v;
}

function asClient(value: BonoRow["clients"]) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function sendBonoConsumptionEmail(params: {
  clientName: string;
  clientEmail: string;
  bonoCode: string;
  productName: string;
  remaining: number;
  total: number;
  expiresAt: string;
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";
  if (!smtpHost || !smtpUser || !smtpPass) return { ok: false as const, reason: "smtp_not_configured" };

  const clinicCopyEmail =
    process.env.BONO_CLINIC_COPY_EMAIL ??
    process.env.CONTACT_TO_EMAIL ??
    "fisioterapia.rocblanc@gmail.com";
  const extraCopy = process.env.BONO_EXTRA_COPY_EMAIL ?? process.env.CONTACT_CC_EMAIL ?? "";
  const ccList = [clinicCopyEmail, extraCopy].filter(Boolean);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `"Clínica - Bonos" <${smtpUser}>`,
    to: params.clientEmail,
    cc: ccList.length ? ccList : undefined,
    subject: "Sesión consumida de tu bono",
    text: [
      `Hola ${params.clientName},`,
      "",
      "Hemos registrado una sesión consumida de tu bono.",
      `Bono: ${params.productName}`,
      `Código: ${params.bonoCode}`,
      `Sesiones restantes: ${params.remaining}/${params.total}`,
      `Caducidad: ${params.expiresAt}`,
      "",
      "Gracias por confiar en nosotros.",
    ].join("\n"),
  });

  return { ok: true as const };
}

export async function POST(request: Request) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const code = normalizeCode(String(body.code ?? ""));
  const source: "manual" | "qr" = body.source === "qr" ? "qr" : "manual";
  if (!code) {
    return NextResponse.json({ ok: false, message: "Código de bono obligatorio." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: bonoRaw, error: bonoError } = await supabase
    .from("client_bonos")
    .select(
      "id, client_id, product_name, unique_code, sessions_total, sessions_remaining, expires_at, is_active, clients(full_name, email)",
    )
    .eq("unique_code", code)
    .maybeSingle();

  if (bonoError) {
    return NextResponse.json({ ok: false, message: "No se pudo validar el bono." }, { status: 500 });
  }
  if (!bonoRaw) {
    return NextResponse.json({ ok: false, message: "Bono no encontrado." }, { status: 404 });
  }

  const bono = bonoRaw as unknown as BonoRow;
  const todayIso = new Date().toISOString().slice(0, 10);
  if (!bono.is_active) {
    return NextResponse.json({ ok: false, message: "El bono no está activo." }, { status: 400 });
  }
  if (bono.sessions_remaining <= 0) {
    return NextResponse.json({ ok: false, message: "El bono ya no tiene sesiones disponibles." }, { status: 400 });
  }
  if (bono.expires_at < todayIso) {
    return NextResponse.json({ ok: false, message: "El bono está caducado." }, { status: 400 });
  }

  const nextRemaining = bono.sessions_remaining - 1;
  const { error: updateBonoError } = await supabase
    .from("client_bonos")
    .update({
      sessions_remaining: nextRemaining,
      is_active: nextRemaining > 0,
    })
    .eq("id", bono.id)
    .eq("sessions_remaining", bono.sessions_remaining);

  if (updateBonoError) {
    return NextResponse.json(
      { ok: false, message: "No se pudo actualizar el bono. Reintenta." },
      { status: 409 },
    );
  }

  const { error: consumeError } = await supabase.from("client_bono_consumptions").insert({
    bono_id: bono.id,
    client_id: bono.client_id,
    consumed_by_staff_id: auth.userId,
    source,
  });
  if (consumeError) {
    return NextResponse.json(
      { ok: false, message: "Sesión descontada, pero no se pudo guardar el historial." },
      { status: 500 },
    );
  }

  const { data: activeRows, error: activeError } = await supabase
    .from("client_bonos")
    .select("sessions_remaining, expires_at")
    .eq("client_id", bono.client_id)
    .eq("is_active", true)
    .gt("sessions_remaining", 0)
    .gte("expires_at", todayIso);

  if (!activeError) {
    const active = activeRows ?? [];
    const totalRemaining = active.reduce((acc, row) => acc + Number(row.sessions_remaining ?? 0), 0);
    const maxExpiry = active.reduce<string | null>((acc, row) => {
      const d = String(row.expires_at ?? "");
      if (!d) return acc;
      if (!acc) return d;
      return d > acc ? d : acc;
    }, null);
    await supabase
      .from("clients")
      .update({
        bono_remaining_sessions: totalRemaining > 0 ? totalRemaining : 0,
        bono_expires_at: maxExpiry,
      })
      .eq("id", bono.client_id);
  }

  const client = asClient(bono.clients);
  let emailStatus: "not_sent" | "sent" | "smtp_not_configured" | "failed" = "not_sent";
  if (client?.email?.trim()) {
    try {
      const sent = await sendBonoConsumptionEmail({
        clientName: client.full_name ?? "Cliente",
        clientEmail: client.email.trim(),
        bonoCode: bono.unique_code,
        productName: bono.product_name,
        remaining: nextRemaining,
        total: bono.sessions_total,
        expiresAt: bono.expires_at,
      });
      emailStatus = sent.ok ? "sent" : "smtp_not_configured";
    } catch {
      emailStatus = "failed";
    }
  }

  return NextResponse.json({
    ok: true,
    result: {
      bonoId: bono.id,
      uniqueCode: bono.unique_code,
      productName: bono.product_name,
      sessionsRemaining: nextRemaining,
      sessionsTotal: bono.sessions_total,
      expiresAt: bono.expires_at,
      clientName: client?.full_name ?? null,
      emailStatus,
    },
  });
}
