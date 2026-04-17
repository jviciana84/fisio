import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
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
    return NextResponse.json(
      { ok: false, message: "Solicitud inválida." },
      { status: 400 },
    );
  }
}
