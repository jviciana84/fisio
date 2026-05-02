import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  bonoId?: string;
  /** Opcional; por defecto el email del cliente en ficha */
  toEmail?: string | null;
};

const BRAND_FOOT = "Clínica: Fisioterapia Roc Blanc (Terrassa)";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataUrlToPngBuffer(dataUrl: string): Buffer | null {
  const m = /^data:image\/(png|jpeg|jpg);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!m?.[2]) return null;
  try {
    return Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
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

  const bonoId = typeof body.bonoId === "string" ? body.bonoId.trim() : "";
  if (!bonoId) {
    return NextResponse.json({ ok: false, message: "Identificador del bono obligatorio." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("client_bonos")
    .select(
      `
      id,
      unique_code,
      product_name,
      qr_payload,
      qr_data_url,
      sessions_remaining,
      sessions_total,
      expires_at,
      clients (
        full_name,
        email
      )
    `,
    )
    .eq("id", bonoId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ ok: false, message: "Bono no encontrado." }, { status: 404 });
  }

  const clientRel = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const clientName = clientRel?.full_name?.trim() || "Cliente";
  const fallbackEmail = (clientRel?.email ?? "").trim();

  let to = "";
  if (typeof body.toEmail === "string" && body.toEmail.includes("@")) {
    to = body.toEmail.trim();
  } else {
    to = fallbackEmail;
  }

  if (!to) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "No hay email para enviar el bono (añádalo en la ficha del cliente o indica uno en petición posterior).",
      },
      { status: 400 },
    );
  }

  let png: Buffer | null =
    typeof row.qr_data_url === "string" ? dataUrlToPngBuffer(row.qr_data_url) : null;

  if (!png) {
    try {
      png = await QRCode.toBuffer(String(row.qr_payload), { type: "png", width: 480, margin: 2 });
    } catch {
      return NextResponse.json({ ok: false, message: "No se pudo generar la imagen del QR para adjuntar." }, { status: 500 });
    }
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json(
      {
        ok: false,
        message: "SMTP no configurado (.env SMTP_HOST, SMTP_USER, SMTP_PASS…). Configura correo como en otros envíos.",
        reason: "smtp_not_configured",
      },
      { status: 503 },
    );
  }

  const clinicCopyEmail =
    process.env.BONO_CLINIC_COPY_EMAIL ??
    process.env.CONTACT_TO_EMAIL ??
    "fisioterapia.rocblanc@gmail.com";
  const extraCopy = process.env.BONO_EXTRA_COPY_EMAIL ?? process.env.CONTACT_CC_EMAIL ?? "";
  const ccList = [clinicCopyEmail, extraCopy].filter(Boolean);

  const safeFilename = `${String(row.unique_code).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80) || "bono"}`;
  const filename = `${safeFilename}-qr.png`;
  const caduca = new Date(`${String(row.expires_at)}T12:00:00`).toLocaleDateString("es-ES");

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: `"Fisioterapia Roc Blanc" <${smtpUser}>`,
      to,
      cc: ccList.length > 0 ? ccList : undefined,
      subject: `Tu bono ${row.unique_code} — Fisioterapia Roc Blanc`,
      attachments: [{ filename, content: png, contentType: "image/png" }],
      text: [
        `Hola ${clientName},`,
        "",
        `Aquí tienes los datos del bono: ${String(row.product_name)}`,
        `Código del bono: ${String(row.unique_code)}`,
        `Sesiones restantes: ${row.sessions_remaining}/${row.sessions_total}`,
        `Caducidad: ${caduca}`,
        "",
        "Va adjunta una imagen PNG con tu código QR (puedes enseñarla en pantalla del móvil o imprimirla).",
        "",
        `${BRAND_FOOT}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
          <p>Hola <strong>${escapeHtml(clientName)}</strong>,</p>
          <p>Te adjuntamos la tarjeta con el <strong>QR</strong> de tu bono.</p>
          <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#f8fafc;max-width:420px;margin:12px 0">
            <p style="margin:0 0 6px 0;font-size:16px">${escapeHtml(String(row.product_name))}</p>
            <p style="margin:0;font-size:15px;font-weight:700">${escapeHtml(String(row.unique_code))}</p>
            <p style="margin:12px 0 0 0;color:#475569">${row.sessions_remaining}/${row.sessions_total} sesiones · caduca ${escapeHtml(caduca)}</p>
          </div>
          <p style="font-size:14px">${escapeHtml(BRAND_FOOT)}</p>
        </div>`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al enviar correo.";
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: to });
}
