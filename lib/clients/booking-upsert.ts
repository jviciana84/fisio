import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function missingEstadoPagoColumn(err: PostgrestError | null): boolean {
  if (!err) return false;
  if (err.code === "42703") return true;
  return /estado_pago|column .* does not exist/i.test(err.message ?? "");
}

type UpsertParams = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  userNotes?: string;
  appointmentStartIso: string;
};

function buildBookingNote(params: UpsertParams): string {
  return [
    `[Reserva web ${params.appointmentStartIso}]`,
    `Dirección: ${params.address.trim()}`,
    "Consentimiento RGPD: aceptado al confirmar la reserva online.",
    params.userNotes?.trim() ? `Notas: ${params.userNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function appendNotes(prev: string | null | undefined, block: string): string {
  const p = prev?.trim();
  if (!p) return block;
  return `${p}\n\n---\n\n${block}`;
}

/**
 * Registra o actualiza un cliente tras una reserva online (misma idea que bonos/lead).
 */
export async function upsertClientFromBooking(params: UpsertParams): Promise<{ ok: boolean }> {
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim().replace(/\s+/g, " ");
  const block = buildBookingNote(params);

  const supabase = createSupabaseAdminClient();

  const { data: byEmail, error: emailLookupError } = await supabase
    .from("clients")
    .select("id, notes")
    .eq("email", email)
    .maybeSingle();

  if (emailLookupError) {
    console.error("[booking] lookup email", emailLookupError);
    return { ok: false };
  }

  if (byEmail?.id) {
    const notes = appendNotes(byEmail.notes, block);
    const rowWithEstado = {
      full_name: params.fullName.trim(),
      email,
      phone,
      notes,
      estado_pago: "pendiente_validacion" as const,
    };
    const rowWithoutEstado = {
      full_name: params.fullName.trim(),
      email,
      phone,
      notes: `${notes} | estado: pendiente_validacion`,
    };

    let err = (await supabase.from("clients").update(rowWithEstado).eq("id", byEmail.id)).error;
    if (missingEstadoPagoColumn(err)) {
      err = (await supabase.from("clients").update(rowWithoutEstado).eq("id", byEmail.id)).error;
    }
    if (err) {
      console.error("[booking] update client", err);
      return { ok: false };
    }
    return { ok: true };
  }

  const rowWithEstado = {
    full_name: params.fullName.trim(),
    email,
    phone,
    notes: block,
    estado_pago: "pendiente_validacion" as const,
  };
  const rowWithoutEstado = {
    full_name: params.fullName.trim(),
    email,
    phone,
    notes: `${block} | estado: pendiente_validacion`,
  };

  let ins = await supabase.from("clients").insert(rowWithEstado);
  if (missingEstadoPagoColumn(ins.error)) {
    ins = await supabase.from("clients").insert(rowWithoutEstado);
  }

  if (!ins.error) {
    return { ok: true };
  }

  if (ins.error.code === "23505") {
    const { data: byPhone } = await supabase.from("clients").select("id, notes").eq("phone", phone).maybeSingle();
    if (byPhone?.id) {
      const notes = appendNotes(byPhone.notes, block);
      const up = {
        full_name: params.fullName.trim(),
        email,
        phone,
        notes,
        estado_pago: "pendiente_validacion" as const,
      };
      const upNo = {
        full_name: params.fullName.trim(),
        email,
        phone,
        notes: `${notes} | estado: pendiente_validacion`,
      };
      let uperr = (await supabase.from("clients").update(up).eq("id", byPhone.id)).error;
      if (missingEstadoPagoColumn(uperr)) {
        uperr = (await supabase.from("clients").update(upNo).eq("id", byPhone.id)).error;
      }
      if (!uperr) return { ok: true };
      console.error("[booking] update by phone", uperr);
    }
  }

  console.error("[booking] insert client", ins.error);
  return { ok: false };
}
