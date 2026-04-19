import type { SupabaseClient } from "@supabase/supabase-js";

/** Nombre completo comparable (minúsculas, sin acentos fuertes, espacios colapsados). */
export function normalizeFullName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(dbFullName: string | null | undefined, formFullNameNorm: string): boolean {
  if (!dbFullName?.trim()) return false;
  return normalizeFullName(dbFullName) === formFullNameNorm;
}

function hasStoredWebSignature(v: string | null | undefined): boolean {
  return typeof v === "string" && v.length > 80 && v.startsWith("data:image/png;base64,");
}

function phoneVariants(phone: string): string[] {
  const t = phone.trim();
  const noSpace = t.replace(/\s/g, "");
  return [...new Set([t, noSpace].filter(Boolean))];
}

export type SignatureReuseLookup = {
  eligible: boolean;
  /** Fila que ya tiene firma web y coincide identidad */
  clientId?: string;
};

/**
 * Busca un cliente activo con la misma identidad (email o teléfono + nombre) y firma web ya guardada.
 */
export async function findSignatureReuse(
  supabase: SupabaseClient,
  params: { email: string; phone: string; fullName: string },
): Promise<SignatureReuseLookup> {
  const email = params.email.toLowerCase().trim();
  const formNameNorm = normalizeFullName(params.fullName);
  const phones = phoneVariants(params.phone);

  const { data: byEmail, error: errEmail } = await supabase
    .from("clients")
    .select("id, full_name, bono_web_signature_png")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (errEmail?.code === "42703") {
    return { eligible: false };
  }
  if (errEmail && errEmail.code !== "PGRST116") {
    console.warn("[signature-reuse] email lookup", errEmail.message);
  }

  if (
    byEmail?.id &&
    hasStoredWebSignature(byEmail.bono_web_signature_png) &&
    namesMatch(byEmail.full_name, formNameNorm)
  ) {
    return { eligible: true, clientId: byEmail.id };
  }

  for (const pv of phones) {
    const { data: byPhone, error: errPhone } = await supabase
      .from("clients")
      .select("id, full_name, bono_web_signature_png")
      .eq("phone", pv)
      .eq("is_active", true)
      .maybeSingle();

    if (errPhone?.code === "42703") {
      return { eligible: false };
    }
    if (errPhone && errPhone.code !== "PGRST116") {
      console.warn("[signature-reuse] phone lookup", errPhone.message);
    }

    if (
      byPhone?.id &&
      hasStoredWebSignature(byPhone.bono_web_signature_png) &&
      namesMatch(byPhone.full_name, formNameNorm)
    ) {
      return { eligible: true, clientId: byPhone.id };
    }
  }

  return { eligible: false };
}
