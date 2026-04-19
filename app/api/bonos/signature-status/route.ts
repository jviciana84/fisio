import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { findSignatureReuse } from "@/lib/bonos/signature-reuse";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function required(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

/**
 * Indica si el usuario puede saltarse la firma en canvas (ya consta en base de datos).
 */
export async function POST(request: Request) {
  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, message: "Servicio no configurado." }, { status: 503 });
    }

    const body = (await request.json()) as {
      name?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    const name = required(body.name);
    const lastName = required(body.lastName);
    const email = required(body.email)?.toLowerCase();
    const phone = required(body.phone);

    if (!name || !lastName || !email || !phone) {
      return NextResponse.json({ ok: false, message: "Faltan datos." }, { status: 400 });
    }

    const fullName = `${name} ${lastName}`.trim();
    const supabase = createSupabaseAdminClient();
    const { eligible } = await findSignatureReuse(supabase, { email, phone, fullName });

    return NextResponse.json({ ok: true, skipSignature: eligible });
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }
}
