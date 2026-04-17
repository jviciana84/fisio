import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { env } from "@/lib/env";
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

function missingEstadoPagoColumn(err: PostgrestError | null): boolean {
  if (!err) return false;
  if (err.code === "42703") return true;
  return /estado_pago|column .* does not exist/i.test(err.message ?? "");
}

export async function POST(request: Request) {
  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "[bonos/lead] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno (revisa Vercel → Settings → Environment Variables).",
      );
      return NextResponse.json(
        {
          ok: false,
          message:
            "El registro no está disponible: falta configurar Supabase en el servidor (SUPABASE_SERVICE_ROLE_KEY y URL).",
        },
        { status: 503 },
      );
    }

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

    const rowWithEstado = {
      full_name: fullName,
      email,
      phone,
      notes,
      estado_pago: "pendiente_contacto" as const,
    };

    const rowWithoutEstado = {
      full_name: fullName,
      email,
      phone,
      notes: `${notes} | estado: pendiente_contacto`,
    };

    const { data: byEmail, error: emailLookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (emailLookupError) {
      console.error("[bonos/lead] lookup email", emailLookupError);
      return NextResponse.json(
        { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
        { status: 500 },
      );
    }

    if (byEmail?.id) {
      let err = (await supabase.from("clients").update(rowWithEstado).eq("id", byEmail.id)).error;
      if (missingEstadoPagoColumn(err)) {
        err = (await supabase.from("clients").update(rowWithoutEstado).eq("id", byEmail.id)).error;
      }
      if (err) {
        console.error("[bonos/lead] update", err);
        return NextResponse.json(
          { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    let ins = await supabase.from("clients").insert(rowWithEstado);
    if (missingEstadoPagoColumn(ins.error)) {
      ins = await supabase.from("clients").insert(rowWithoutEstado);
    }

    if (!ins.error) {
      return NextResponse.json({ ok: true });
    }

    if (ins.error.code === "23505") {
      const { data: byPhone } = await supabase.from("clients").select("id").eq("phone", phone).maybeSingle();
      if (byPhone?.id) {
        let up = await supabase.from("clients").update(rowWithEstado).eq("id", byPhone.id);
        if (missingEstadoPagoColumn(up.error)) {
          up = await supabase.from("clients").update(rowWithoutEstado).eq("id", byPhone.id);
        }
        if (!up.error) {
          return NextResponse.json({ ok: true });
        }
        console.error("[bonos/lead] update by phone", up.error);
      }
    }

    console.error("[bonos/lead] insert", ins.error);
    return NextResponse.json(
      { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
      { status: 500 },
    );
  } catch (e) {
    console.error("[bonos/lead]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Faltan variables de entorno de Supabase")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El registro no está disponible: falta configurar Supabase en el servidor (SUPABASE_SERVICE_ROLE_KEY y URL).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }
}
