import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentMethod = "cash" | "bizum" | "card";
type Body = {
  clientId?: string | null;
  productIds: string[];
  manualAmountEuros?: number;
  paymentMethod: PaymentMethod;
};

type ProductDb = {
  id: string;
  name: string;
  price_cents: number;
  product_kind: string | null;
  bono_sessions: number | null;
};

type TicketLineInsert = {
  ticket_id: string;
  product_id: string | null;
  concept: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

type IssuedBono = {
  id: string;
  uniqueCode: string;
  productName: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  expiresAt: string;
  qrDataUrl: string | null;
};

function isPaymentMethod(v: string): v is PaymentMethod {
  return v === "cash" || v === "bizum" || v === "card";
}

function addOneYearIsoDate(fromDate: Date): string {
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function generateTicketNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TK-${y}${m}${day}-${rnd}`;
}

function buildBonoUniqueCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `BONO-${y}${m}${d}-${rnd}`;
}

async function sendBonoIssuedEmail(params: {
  clientName: string;
  clientEmail: string;
  bonos: IssuedBono[];
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return { ok: false as const, reason: "smtp_not_configured" };
  }

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
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const bonosHtml = params.bonos
    .map(
      (b) => `
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0 0 12px 0">
        <p style="margin:0 0 6px 0"><strong>${b.productName}</strong></p>
        <p style="margin:0 0 6px 0">Código: <strong>${b.uniqueCode}</strong></p>
        <p style="margin:0 0 6px 0">Sesiones: ${b.sessionsRemaining}/${b.sessionsTotal}</p>
        <p style="margin:0 0 10px 0">Caduca: ${new Date(`${b.expiresAt}T12:00:00`).toLocaleDateString("es-ES")}</p>
        ${
          b.qrDataUrl
            ? `<img src="${b.qrDataUrl}" alt="QR bono ${b.uniqueCode}" width="180" height="180" style="display:block;border:1px solid #cbd5e1;border-radius:10px" />`
            : ""
        }
      </div>
    `,
    )
    .join("");

  await transporter.sendMail({
    from: `"Clínica - Bonos" <${smtpUser}>`,
    to: params.clientEmail,
    cc: ccList.length > 0 ? ccList : undefined,
    subject: "Tu bono de Fisioterapia Roc Blanc",
    text: [
      `Hola ${params.clientName},`,
      "",
      "Adjuntamos los datos de tu bono:",
      ...params.bonos.flatMap((b) => [
        `- ${b.productName}`,
        `  Código: ${b.uniqueCode}`,
        `  Sesiones: ${b.sessionsRemaining}/${b.sessionsTotal}`,
        `  Caduca: ${b.expiresAt}`,
      ]),
      "",
      "Puedes mostrar este email en recepción para validar tu bono.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <p>Hola <strong>${params.clientName}</strong>,</p>
        <p>Te enviamos la información de tu bono activo.</p>
        ${bonosHtml}
        <p>Puedes mostrar este email en recepción para validar tu bono.</p>
      </div>
    `,
  });

  return { ok: true as const };
}

export async function POST(request: Request) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Body;
    const paymentMethod = body.paymentMethod;
    const manualAmountEuros = Number(body.manualAmountEuros ?? 0);
    const manualAmountCents = Math.max(0, Math.round(manualAmountEuros * 100));
    const productIds = [...new Set((body.productIds ?? []).filter(Boolean))];

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json({ ok: false, message: "Forma de pago no válida" }, { status: 400 });
    }

    if (!productIds.length && manualAmountCents <= 0) {
      return NextResponse.json(
        { ok: false, message: "Añade al menos un producto o un importe manual" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price_cents, product_kind, bono_sessions")
      .in("id", productIds)
      .eq("is_active", true);

    if (productError) {
      return NextResponse.json(
        { ok: false, message: "No se pudieron validar los productos" },
        { status: 500 },
      );
    }

    const rows = (products ?? []) as ProductDb[];
    const bonoProducts = rows.filter((p) => p.product_kind === "bono" && (p.bono_sessions ?? 0) > 0);
    const bonoSessionsToAdd = bonoProducts.reduce((sum, p) => sum + (p.bono_sessions ?? 0), 0);

    if (bonoSessionsToAdd > 0 && !body.clientId) {
      return NextResponse.json(
        { ok: false, message: "Para vender un bono debes seleccionar un cliente." },
        { status: 400 },
      );
    }

    if (rows.length !== productIds.length) {
      const foundIds = new Set(rows.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        {
          ok: false,
          message:
            "Hay productos seleccionados que ya no están activos o no existen. Refresca la caja y vuelve a seleccionar.",
          missingProductIds: missingIds,
        },
        { status: 400 },
      );
    }
    const subtotalCents = rows.reduce((sum, p) => sum + p.price_cents, 0);
    const totalCents = subtotalCents + manualAmountCents;

    if (totalCents <= 0) {
      return NextResponse.json({ ok: false, message: "El total debe ser mayor que 0" }, { status: 400 });
    }

    const ticketNumber = await generateTicketNumber();

    const { data: ticket, error: ticketError } = await supabase
      .from("cash_tickets")
      .insert({
        ticket_number: ticketNumber,
        client_id: body.clientId ?? null,
        subtotal_cents: subtotalCents,
        manual_amount_cents: manualAmountCents,
        total_cents: totalCents,
        payment_method: paymentMethod,
        created_by_staff_id: auth.userId,
      })
      .select("id, ticket_number, created_at")
      .single();

    if (ticketError || !ticket) {
      const msg = (ticketError?.message ?? "").toLowerCase();
      if (msg.includes("cash_tickets_payment_method_check") || msg.includes("payment_method")) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "La base de datos no acepta esa forma de pago. Aplica la migración que habilita tarjeta en caja.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: false, message: "No se pudo crear el ticket" }, { status: 500 });
    }

    const lineItems: TicketLineInsert[] = rows.map((p) => ({
      ticket_id: ticket.id,
      product_id: p.id,
      concept: p.name,
      unit_price_cents: p.price_cents,
      quantity: 1,
      line_total_cents: p.price_cents,
    }));

    if (manualAmountCents > 0) {
      lineItems.push({
        ticket_id: ticket.id,
        product_id: null,
        concept: "Importe manual",
        unit_price_cents: manualAmountCents,
        quantity: 1,
        line_total_cents: manualAmountCents,
      });
    }

    const { error: linesError } = await supabase.from("cash_ticket_items").insert(lineItems);
    if (linesError) {
      return NextResponse.json(
        { ok: false, message: "Ticket creado, pero falló el detalle de líneas" },
        { status: 500 },
      );
    }

    const issuedBonos: IssuedBono[] = [];
    let bonoEmailStatus: "not_sent" | "sent" | "smtp_not_configured" | "failed" = "not_sent";

    if (bonoSessionsToAdd > 0 && body.clientId) {
      const { data: clientBefore, error: clientBeforeError } = await supabase
        .from("clients")
        .select("full_name, email, bono_remaining_sessions")
        .eq("id", body.clientId)
        .maybeSingle();

      if (clientBeforeError) {
        return NextResponse.json(
          {
            ok: false,
            message: "Ticket grabado, pero no se pudo actualizar el bono del cliente.",
          },
          { status: 500 },
        );
      }

      const nextRemaining =
        Math.max(0, Number(clientBefore?.bono_remaining_sessions ?? 0)) + bonoSessionsToAdd;
      const expiresAt = addOneYearIsoDate(new Date());

      const { error: bonoUpdateError } = await supabase
        .from("clients")
        .update({
          bono_remaining_sessions: nextRemaining,
          bono_expires_at: expiresAt,
        })
        .eq("id", body.clientId);

      if (bonoUpdateError) {
        return NextResponse.json(
          {
            ok: false,
            message: "Ticket grabado, pero no se pudo asignar la caducidad del bono.",
          },
          { status: 500 },
        );
      }

      for (const bonoProduct of bonoProducts) {
        const uniqueCode = buildBonoUniqueCode();
        const sessionsTotal = bonoProduct.bono_sessions ?? 0;
        const qrPayload = JSON.stringify({
          code: uniqueCode,
          clientId: body.clientId,
          productId: bonoProduct.id,
        });
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 300,
        });

        const { data: bonoRow, error: bonoInsertError } = await supabase
          .from("client_bonos")
          .insert({
            client_id: body.clientId,
            ticket_id: ticket.id,
            product_id: bonoProduct.id,
            product_name: bonoProduct.name,
            unique_code: uniqueCode,
            qr_payload: qrPayload,
            qr_data_url: qrDataUrl,
            sessions_total: sessionsTotal,
            sessions_remaining: sessionsTotal,
            expires_at: expiresAt,
            is_active: true,
          })
          .select("id")
          .single();

        if (bonoInsertError || !bonoRow) {
          return NextResponse.json(
            {
              ok: false,
              message: "Ticket grabado, pero no se pudo emitir el registro del bono.",
            },
            { status: 500 },
          );
        }

        issuedBonos.push({
          id: bonoRow.id,
          uniqueCode,
          productName: bonoProduct.name,
          sessionsTotal,
          sessionsRemaining: sessionsTotal,
          expiresAt,
          qrDataUrl,
        });
      }

      const clientEmail = String(clientBefore?.email ?? "").trim();
      const clientName = String(clientBefore?.full_name ?? "Cliente").trim() || "Cliente";
      if (clientEmail && issuedBonos.length > 0) {
        try {
          const sendResult = await sendBonoIssuedEmail({
            clientName,
            clientEmail,
            bonos: issuedBonos,
          });
          bonoEmailStatus = sendResult.ok ? "sent" : "smtp_not_configured";
        } catch {
          bonoEmailStatus = "failed";
        }
      }
    }

    let clientName: string | null = null;
    if (body.clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("full_name")
        .eq("id", body.clientId)
        .maybeSingle();
      clientName = client?.full_name ?? null;
    }

    return NextResponse.json({
      ok: true,
      receipt: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        createdAt: ticket.created_at,
        paymentMethod,
        clientName,
        lines: lineItems.map((l) => ({
          concept: l.concept,
          amountEuros: l.line_total_cents / 100,
        })),
        totalEuros: totalCents / 100,
        bonosIssued: issuedBonos,
        bonoEmailStatus,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida" }, { status: 400 });
  }
}
