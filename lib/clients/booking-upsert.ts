import type { PostgrestError } from "@supabase/supabase-js";
import { mergeClientNotesBlock } from "@/lib/bonos/merge-client-notes";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

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
    "Consentimiento RGPD: aceptada la Política de Privacidad al confirmar la reserva online.",
    params.userNotes?.trim() ? `Notas: ${params.userNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildBookingUpdateVariants(
  fullName: string,
  email: string,
  phone: string,
  mergedNotes: string,
): Record<string, unknown>[] {
  const base = {
    full_name: fullName,
    email,
    phone,
    notes: mergedNotes,
  };
  return [
    { ...base, estado_pago: "pendiente_validacion", origen_cliente: "internet" },
    { ...base, estado_pago: "pendiente_validacion" },
    {
      ...base,
      notes: `${mergedNotes} | estado: pendiente_validacion`,
      origen_cliente: "internet",
    },
    { ...base, notes: `${mergedNotes} | estado: pendiente_validacion` },
  ];
}

function buildBookingInsertVariants(
  fullName: string,
  email: string,
  phone: string,
  block: string,
): Record<string, unknown>[] {
  const base = { full_name: fullName, email, phone, notes: block };
  return [
    { ...base, estado_pago: "pendiente_validacion", origen_cliente: "internet" },
    { ...base, estado_pago: "pendiente_validacion" },
    {
      ...base,
      notes: `${block} | estado: pendiente_validacion`,
      origen_cliente: "internet",
    },
    { ...base, notes: `${block} | estado: pendiente_validacion` },
  ];
}

async function updateWithVariants(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  variants: Record<string, unknown>[],
): Promise<PostgrestError | null> {
  let last: PostgrestError | null = null;
  for (const row of variants) {
    const { error } = await supabase.from("clients").update(row).eq("id", id);
    if (!error) return null;
    last = error;
  }
  return last;
}

async function insertWithVariants(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  variants: Record<string, unknown>[],
) {
  let last = await supabase.from("clients").insert(variants[0] as never);
  if (!last.error) return last;
  for (let i = 1; i < variants.length; i++) {
    last = await supabase.from("clients").insert(variants[i] as never);
    if (!last.error) return last;
  }
  return last;
}

/**
 * Registra o actualiza un cliente tras una reserva online (misma idea que bonos/lead).
 */
export async function upsertClientFromBooking(params: UpsertParams): Promise<{ ok: boolean }> {
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim().replace(/\s+/g, " ");
  const block = buildBookingNote(params);
  const fullName = params.fullName.trim();

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
    const mergedNotes = mergeClientNotesBlock(byEmail.notes, block);
    const variants = buildBookingUpdateVariants(fullName, email, phone, mergedNotes);
    const err = await updateWithVariants(supabase, byEmail.id, variants);
    if (err) {
      console.error("[booking] update client", err);
      return { ok: false };
    }
    return { ok: true };
  }

  const insertVariants = buildBookingInsertVariants(fullName, email, phone, block);
  const ins = await insertWithVariants(supabase, insertVariants);

  if (!ins.error) {
    return { ok: true };
  }

  if (ins.error.code === "23505") {
    const { data: byPhone } = await supabase.from("clients").select("id, notes").eq("phone", phone).maybeSingle();
    if (byPhone?.id) {
      const mergedNotes = mergeClientNotesBlock(byPhone.notes, block);
      const variants = buildBookingUpdateVariants(fullName, email, phone, mergedNotes);
      const uperr = await updateWithVariants(supabase, byPhone.id, variants);
      if (!uperr) return { ok: true };
      console.error("[booking] update by phone", uperr);
    }
  }

  console.error("[booking] insert client", ins.error);
  return { ok: false };
}
