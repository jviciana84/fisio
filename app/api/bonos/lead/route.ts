import { NextResponse } from "next/server";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { mergeClientNotesBlock } from "@/lib/bonos/merge-client-notes";
import { findSignatureReuse } from "@/lib/bonos/signature-reuse";
import { bonosWebRequireSignature } from "@/lib/bonos/web-signature-flag";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressPostalCode?: string;
  addressCity?: string;
  bonoSessions?: number;
  bonoPrice?: number;
  paymentMethod?: "bizum" | "paypal";
  signaturePngBase64?: string;
  reuseWebSignature?: boolean;
};

function required(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

type RowPack = {
  fullName: string;
  email: string;
  phone: string;
  mergedNotes: string;
  address: string;
  addressStreet: string;
  addressNumber: string;
  addressPostalCode: string;
  addressCity: string;
};

/** Variantes de actualización/inserción: primero con columnas nuevas (origen, lead), luego fallback sin columna opcional. */
function buildUpdateVariants(
  pack: RowPack,
  opts: { requireSig: boolean; sigRaw: string | null; includeOrigen: boolean },
): Record<string, unknown>[] {
  const { fullName, email, phone, mergedNotes } = pack;
  const { address, addressStreet, addressNumber, addressPostalCode, addressCity } = pack;
  const { requireSig, sigRaw, includeOrigen } = opts;
  const origen = includeOrigen ? ({ origen_cliente: "internet" } as const) : {};
  const addressSplit = {
    address,
    address_street: addressStreet,
    address_number: addressNumber,
    address_postal_code: addressPostalCode,
    address_city: addressCity,
  };
  const addressLegacy = { address };

  const rowWithEstadoNoSig = {
    full_name: fullName,
    email,
    phone,
    ...addressSplit,
    notes: mergedNotes,
    estado_pago: "pendiente_contacto" as const,
    lead_contacted_at: null as null,
    ...origen,
  };
  const rowWithEstadoNoSigLegacy = {
    full_name: fullName,
    email,
    phone,
    ...addressLegacy,
    notes: mergedNotes,
    estado_pago: "pendiente_contacto" as const,
    lead_contacted_at: null as null,
    ...origen,
  };

  const rowWithEstadoNoSigNoLeadCol = {
    full_name: fullName,
    email,
    phone,
    ...addressSplit,
    notes: mergedNotes,
    estado_pago: "pendiente_contacto" as const,
    ...origen,
  };
  const rowWithEstadoNoSigNoLeadColLegacy = {
    full_name: fullName,
    email,
    phone,
    ...addressLegacy,
    notes: mergedNotes,
    estado_pago: "pendiente_contacto" as const,
    ...origen,
  };

  const rowWithoutEstadoNoSig = {
    full_name: fullName,
    email,
    phone,
    ...addressSplit,
    notes: `${mergedNotes} | estado: pendiente_contacto`,
    ...origen,
  };
  const rowWithoutEstadoNoSigLegacy = {
    full_name: fullName,
    email,
    phone,
    ...addressLegacy,
    notes: `${mergedNotes} | estado: pendiente_contacto`,
    ...origen,
  };

  if (!requireSig || !sigRaw) {
    return [
      rowWithEstadoNoSig,
      rowWithEstadoNoSigLegacy,
      rowWithEstadoNoSigNoLeadCol,
      rowWithEstadoNoSigNoLeadColLegacy,
      rowWithoutEstadoNoSig,
      rowWithoutEstadoNoSigLegacy,
    ];
  }

  const rowWithEstado = {
    ...rowWithEstadoNoSig,
    bono_web_signature_png: sigRaw,
  };

  const rowWithEstadoNoLeadCol = {
    ...rowWithEstadoNoSigNoLeadCol,
    bono_web_signature_png: sigRaw,
  };

  const rowWithoutEstado = {
    ...rowWithoutEstadoNoSig,
    bono_web_signature_png: sigRaw,
  };

  const rowWithEstadoLegacy = { ...rowWithEstadoNoSigLegacy, bono_web_signature_png: sigRaw };
  const rowWithEstadoNoLeadColLegacy = { ...rowWithEstadoNoSigNoLeadColLegacy, bono_web_signature_png: sigRaw };
  const rowWithoutEstadoLegacy = { ...rowWithoutEstadoNoSigLegacy, bono_web_signature_png: sigRaw };

  return [
    rowWithEstado,
    rowWithEstadoLegacy,
    rowWithEstadoNoLeadCol,
    rowWithEstadoNoLeadColLegacy,
    rowWithoutEstado,
    rowWithoutEstadoLegacy,
    rowWithoutEstadoNoSig,
    rowWithoutEstadoNoSigLegacy,
  ];
}

function chainVariants(pack: RowPack, opts: { requireSig: boolean; sigRaw: string | null }): Record<string, unknown>[] {
  const withOrig = buildUpdateVariants(pack, { ...opts, includeOrigen: true });
  const noOrig = buildUpdateVariants(pack, { ...opts, includeOrigen: false });
  return [...withOrig, ...noOrig];
}

/**
 * Garantiza pendiente de llamada en listados: a veces el primer UPDATE encaja en una variante
 * sin `lead_contacted_at` (p. ej. migración parcial) y el lead seguía “contactado”.
 */
async function ensurePendienteContactoLead(supabase: SupabaseClient, clientId: string) {
  const rows: Record<string, unknown>[] = [
    { estado_pago: "pendiente_contacto", lead_contacted_at: null },
    { estado_pago: "pendiente_contacto" },
  ];
  for (const row of rows) {
    const { error } = await supabase.from("clients").update(row).eq("id", clientId);
    if (!error) return;
    if (error.code !== "42703" && !String(error.message ?? "").toLowerCase().includes("does not exist")) {
      return;
    }
  }
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
    const addressStreet = required(body.addressStreet);
    const addressNumber = required(body.addressNumber);
    const addressPostalCode = required(body.addressPostalCode);
    const addressCity = required(body.addressCity);
    const paymentMethod = body.paymentMethod;
    const bonoSessions = Number(body.bonoSessions ?? 0);
    const bonoPrice = Number(body.bonoPrice ?? 0);
    const reuseWebSignature = body.reuseWebSignature === true;
    const requireSig = bonosWebRequireSignature();

    if (!name || !lastName || !email || !phone || !addressStreet || !addressNumber || !addressPostalCode || !addressCity) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos obligatorios del cliente." },
        { status: 400 },
      );
    }
    const address = `${addressStreet} ${addressNumber}, ${addressPostalCode} ${addressCity}`;

    if (!["bizum", "paypal"].includes(String(paymentMethod))) {
      return NextResponse.json(
        { ok: false, message: "Método de pago no válido." },
        { status: 400 },
      );
    }

    const fullName = `${name} ${lastName}`.trim();

    const fwd = request.headers.get("x-forwarded-for");
    const ip = (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
    const ipNote = ip ? ` | ip: ${ip.slice(0, 45)}` : "";

    const intentBlock = `Lead web bonos | Método preferido: ${paymentMethod} | Bono: ${bonoSessions} sesiones (${bonoPrice} euros) | Dirección: ${address}${ipNote} | registro: ${new Date().toISOString()}`;

    const supabase = createSupabaseAdminClient();

    let sigRaw: string | null = null;
    if (requireSig) {
      if (reuseWebSignature) {
        const { eligible, clientId } = await findSignatureReuse(supabase, { email, phone, fullName });
        if (!eligible || !clientId) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "No se puede reutilizar la firma: no consta una firma previa para este email, teléfono y nombre, o los datos no coinciden.",
            },
            { status: 400 },
          );
        }
        const { data: row, error: fetchErr } = await supabase
          .from("clients")
          .select("notes")
          .eq("id", clientId)
          .maybeSingle();
        if (fetchErr) {
          console.error("[bonos/lead] fetch notes reuse", fetchErr);
          return NextResponse.json(
            { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
            { status: 500 },
          );
        }
        const mergedNotes = mergeClientNotesBlock(row?.notes ?? null, intentBlock);
        const variants = chainVariants(
          {
            fullName,
            email,
            phone,
            mergedNotes,
            address,
            addressStreet,
            addressNumber,
            addressPostalCode,
            addressCity,
          },
          { requireSig: false, sigRaw: null },
        );
        let last: PostgrestError | null = null;
        for (const rowUp of variants) {
          const { error } = await supabase.from("clients").update(rowUp).eq("id", clientId);
          if (!error) {
            await ensurePendienteContactoLead(supabase, clientId);
            return NextResponse.json({ ok: true });
          }
          last = error;
        }
        console.error("[bonos/lead] update reuse", last);
        return NextResponse.json(
          { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
          { status: 500 },
        );
      }

      const raw = typeof body.signaturePngBase64 === "string" ? body.signaturePngBase64.trim() : "";
      if (!raw || raw.length < 120) {
        return NextResponse.json({ ok: false, message: "La firma manuscrita es obligatoria." }, { status: 400 });
      }
      if (raw.length > 2_500_000) {
        return NextResponse.json(
          { ok: false, message: "La firma es demasiado grande. Intenta limpiar y firmar de nuevo." },
          { status: 400 },
        );
      }
      if (!raw.startsWith("data:image/png;base64,")) {
        return NextResponse.json({ ok: false, message: "Formato de firma no válido." }, { status: 400 });
      }
      sigRaw = raw;
    }

    const { data: byEmail, error: emailLookupError } = await supabase
      .from("clients")
      .select("id, notes")
      .ilike("email", email)
      .maybeSingle();

    if (emailLookupError) {
      console.error("[bonos/lead] lookup email", emailLookupError);
      return NextResponse.json(
        { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
        { status: 500 },
      );
    }

    const mergedNotes = byEmail?.id
      ? mergeClientNotesBlock(byEmail.notes, intentBlock)
      : intentBlock;

    const pack: RowPack = {
      fullName,
      email,
      phone,
      mergedNotes,
      address,
      addressStreet,
      addressNumber,
      addressPostalCode,
      addressCity,
    };
    const updateVariants = chainVariants(pack, { requireSig, sigRaw });

    async function updateClient(id: string): Promise<PostgrestError | null> {
      let last: PostgrestError | null = null;
      for (const row of updateVariants) {
        const { error } = await supabase.from("clients").update(row).eq("id", id);
        if (!error) return null;
        last = error;
      }
      return last;
    }

    async function insertClient() {
      const rows = updateVariants;
      let last = await supabase.from("clients").insert(rows[0] as never).select("id").maybeSingle();
      if (!last.error) return last;
      for (let i = 1; i < rows.length; i++) {
        last = await supabase.from("clients").insert(rows[i] as never).select("id").maybeSingle();
        if (!last.error) return last;
      }
      return last;
    }

    if (byEmail?.id) {
      const err = await updateClient(byEmail.id);
      if (err) {
        console.error("[bonos/lead] update", err);
        return NextResponse.json(
          { ok: false, message: "No se pudo registrar el cliente para seguimiento." },
          { status: 500 },
        );
      }
      await ensurePendienteContactoLead(supabase, byEmail.id);
      return NextResponse.json({ ok: true });
    }

    const ins = await insertClient();

    if (!ins.error) {
      const newId = (ins.data as { id?: string } | null)?.id;
      if (newId) await ensurePendienteContactoLead(supabase, newId);
      return NextResponse.json({ ok: true });
    }

    if (ins.error.code === "23505") {
      const { data: byEmailDup, error: dupErr } = await supabase
        .from("clients")
        .select("id, notes")
        .ilike("email", email)
        .maybeSingle();
      if (!dupErr && byEmailDup?.id) {
        const mergedDup = mergeClientNotesBlock(byEmailDup.notes, intentBlock);
          const packDup: RowPack = {
            fullName,
            email,
            phone,
            mergedNotes: mergedDup,
            address,
            addressStreet,
            addressNumber,
            addressPostalCode,
            addressCity,
          };
        const varsDup = chainVariants(packDup, { requireSig, sigRaw });
        let lastE: PostgrestError | null = null;
        for (const row of varsDup) {
          const { error } = await supabase.from("clients").update(row).eq("id", byEmailDup.id);
          if (!error) {
            await ensurePendienteContactoLead(supabase, byEmailDup.id);
            return NextResponse.json({ ok: true });
          }
          lastE = error;
        }
        console.error("[bonos/lead] update after duplicate email", lastE);
      }
      const phoneOpts = [...new Set([phone.trim(), phone.replace(/\s/g, "")])].filter(Boolean);
      for (const pv of phoneOpts) {
        const { data: byPhone } = await supabase.from("clients").select("id, notes").eq("phone", pv).maybeSingle();
        if (byPhone?.id) {
          const mergedPh = mergeClientNotesBlock(byPhone.notes, intentBlock);
          const packPh: RowPack = {
            fullName,
            email,
            phone,
            mergedNotes: mergedPh,
            address,
            addressStreet,
            addressNumber,
            addressPostalCode,
            addressCity,
          };
          const varsPh = chainVariants(packPh, { requireSig, sigRaw });
          let lastP: PostgrestError | null = null;
          for (const row of varsPh) {
            const { error } = await supabase.from("clients").update(row).eq("id", byPhone.id);
            if (!error) {
              await ensurePendienteContactoLead(supabase, byPhone.id);
              return NextResponse.json({ ok: true });
            }
            lastP = error;
          }
          console.error("[bonos/lead] update by phone", lastP);
          break;
        }
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
