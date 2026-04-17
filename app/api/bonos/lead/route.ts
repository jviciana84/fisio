import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  bonoSessions?: number;
  bonoPrice?: number;
  paymentMethod?: "bizum" | "paypal";
};

function required(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const name = required(body.name);
    const lastName = required(body.lastName);
    const email = required(body.email)?.toLowerCase();
    const phone = required(body.phone);
    const address = required(body.address);
    const paymentMethod = body.paymentMethod;
    const bonoSessions = Number(body.bonoSessions ?? 0);
    const bonoPrice = Number(body.bonoPrice ?? 0);

    if (!name || !lastName || !email || !phone || !address) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos obligatorios del cliente." },
        { status: 400 },
      );
    }

    if (!["bizum", "paypal"].includes(String(paymentMethod))) {
      return NextResponse.json(
        { ok: false, message: "Método de pago no válido." },
        { status: 400 },
      );
    }

    const fullName = `${name} ${lastName}`.trim();
    const notes =
      `Lead web bonos | Método preferido: ${paymentMethod} | Bono: ${bonoSessions} sesiones (${bonoPrice} euros) | Dirección: ${address}`;

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("clients").upsert(
      {
        full_name: fullName,
        email,
        phone,
        notes,
        estado_pago: "pendiente_contacto",
      },
      { onConflict: "email" },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }
}
