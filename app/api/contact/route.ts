import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  consentAccepted?: boolean;
};

function required(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (body.consentAccepted !== true) {
      return NextResponse.json(
        { ok: false, message: "Debes aceptar la Política de Privacidad." },
        { status: 400 },
      );
    }
    const name = required(body.name);
    const email = required(body.email);
    const phone = required(body.phone);
    const message = required(body.message);

    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { ok: false, message: "Todos los campos son obligatorios." },
        { status: 400 },
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? "465");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";
    const toEmail = process.env.CONTACT_TO_EMAIL ?? "fisioterapia.rocblanc@gmail.com";
    const ccEmail = process.env.CONTACT_CC_EMAIL ?? "viciana84@gmail.com";

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Falta configurar el servidor SMTP (SMTP_HOST, SMTP_USER y SMTP_PASS).",
        },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const sentAt = new Date().toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      dateStyle: "short",
      timeStyle: "short",
    });

    await transporter.sendMail({
      from: `"Web Fisio Roc Blanc" <${smtpUser}>`,
      to: toEmail,
      cc: ccEmail,
      replyTo: email,
      subject: `Nueva solicitud web - ${name}`,
      text: [
        "Nueva solicitud desde el formulario web",
        "",
        "RGPD: el remitente confirmó en la web la aceptación de la Política de Privacidad.",
        "",
        `Fecha: ${sentAt}`,
        `Nombre: ${name}`,
        `Email: ${email}`,
        `Teléfono: ${phone}`,
        "",
        "Mensaje:",
        message,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }
}
