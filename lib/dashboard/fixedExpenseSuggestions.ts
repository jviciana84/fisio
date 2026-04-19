/**
 * Lista orientativa de partidas de gasto fijo recurrente para clínicas / locales.
 * "predictable" ≈ importe estable en el modelo (sin margen del 10 %).
 * "variable" ≈ partidas con mayor oscilación; en estructura llevan colchón +10 %.
 */

export type FixedExpenseSuggestionKind = "predictable" | "variable";

export type FixedExpenseSuggestion = {
  id: string;
  label: string;
  kind: FixedExpenseSuggestionKind;
  /** Términos a buscar en concepto (canónico) o categoría */
  keywords: string[];
};

export const FIXED_EXPENSE_SUGGESTIONS: FixedExpenseSuggestion[] = [
  // Fijos predecibles (ejemplos)
  { id: "alquiler", label: "Alquiler o arrendamiento del local", kind: "predictable", keywords: ["alquiler", "arrendamiento", "rent"] },
  { id: "ibi", label: "IBI y tasas municipales del inmueble", kind: "predictable", keywords: ["ibi", "municipal", "tasas"] },
  { id: "basuras", label: "Tasa de basuras / residuos", kind: "predictable", keywords: ["basuras", "residuos"] },
  { id: "seguro-local", label: "Seguro del local / RC", kind: "predictable", keywords: ["seguro", "responsabilidad", "rc "] },
  { id: "autonomo", label: "Cuotas de autónomos / cotizaciones", kind: "predictable", keywords: ["autónom", "autonom", "cotiz", "seg.social", "ss"] },
  { id: "gestoria", label: "Gestoría o asesoría fiscal", kind: "predictable", keywords: ["gestor", "asesor", "fiscal"] },
  { id: "contable", label: "Servicios de contabilidad", kind: "predictable", keywords: ["contabil"] },
  { id: "colegio", label: "Cuotas de colegio profesional", kind: "predictable", keywords: ["colegio", "profesional"] },
  { id: "software-fijo", label: "Licencias de software (cuota fija)", kind: "predictable", keywords: ["licencia", "software", "suscripción"] },
  { id: "erp", label: "Software de gestión clínica / agenda", kind: "predictable", keywords: ["erp", "agenda", "cit", "gestión"] },
  { id: "hosting", label: "Hosting, dominio y correo", kind: "predictable", keywords: ["hosting", "dominio", "correo"] },
  { id: "mutua", label: "Mutua o accidentes de trabajo", kind: "predictable", keywords: ["mutua", "accidente"] },
  { id: "financiacion", label: "Cuota de leasing o financiación de equipos", kind: "predictable", keywords: ["leasing", "financi", "cuota"] },
  { id: "nomina", label: "Nóminas y coste salarial fijo", kind: "predictable", keywords: ["nómina", "nomina", "sueldo", "salario"] },
  { id: "limpieza-fija", label: "Limpieza con contrato mensual fijo", kind: "predictable", keywords: ["limpieza"] },
  { id: "vigilancia", label: "Vigilancia / alarma con cuota", kind: "predictable", keywords: ["vigilancia", "alarma", "seguridad"] },
  { id: "sala", label: "Cuota de gimnasio o sala (si contratada)", kind: "predictable", keywords: ["gimnasio", "sala"] },
  // Variables (margen en modelo)
  { id: "luz", label: "Electricidad", kind: "variable", keywords: ["luz", "electricidad"] },
  { id: "agua", label: "Agua y saneamiento", kind: "variable", keywords: ["agua", "saneamiento"] },
  { id: "gas", label: "Gas", kind: "variable", keywords: ["gas"] },
  { id: "internet", label: "Internet y fibra", kind: "variable", keywords: ["internet", "fibra"] },
  { id: "telefono", label: "Telefonía fija y móvil", kind: "variable", keywords: ["teléfono", "telefono", "móvil", "movil"] },
  { id: "comunidad", label: "Comunidad de propietarios", kind: "variable", keywords: ["comunidad", "vecinos"] },
  { id: "mantenimiento", label: "Mantenimiento y reparaciones", kind: "variable", keywords: ["mantenimiento", "reparaci"] },
  { id: "suministros", label: "Suministros de material sanitario / desechable", kind: "variable", keywords: ["suministro", "material", "desechable"] },
  { id: "marketing", label: "Marketing y publicidad variable", kind: "variable", keywords: ["marketing", "ads", "publicidad"] },
  { id: "formacion", label: "Formación y cursos (cuando sea irregular)", kind: "variable", keywords: ["formación", "formacion", "curso"] },
  { id: "transporte", label: "Transporte y desplazamientos", kind: "variable", keywords: ["transporte", "combustible", "km"] },
  { id: "bancos", label: "Comisiones bancarias y TPV", kind: "variable", keywords: ["banco", "comisión", "tpv", "comision"] },
  { id: "legal", label: "Honorarios legales puntuales recurrentes", kind: "variable", keywords: ["legal", "abogado"] },
  { id: "residuos-sanitarios", label: "Gestión de residuos sanitarios", kind: "variable", keywords: ["residuos", "sanitario", "bio"] },
  { id: "papeleria", label: "Papelería y consumibles de oficina", kind: "variable", keywords: ["papelería", "papeleria", "oficina"] },
  { id: "cafeteria", label: "Agua / máquina / cafetería", kind: "variable", keywords: ["café", "cafetera", "agua embotell"] },
  { id: "uniformes", label: "Uniformes y ropa de trabajo", kind: "variable", keywords: ["uniforme", "ropa laboral"] },
  { id: "peajes", label: "Peajes y aparcamiento recurrente", kind: "variable", keywords: ["peaje", "parking", "aparcamiento"] },
  { id: "certificaciones", label: "Certificaciones y acreditaciones", kind: "variable", keywords: ["certific", "acredit"] },
  { id: "amortizacion", label: "Dotación / amortización (si la lleva como cargo)", kind: "predictable", keywords: ["amortiz", "dotación"] },
  { id: "intereses", label: "Intereses de préstamos (cuota fija)", kind: "predictable", keywords: ["interés", "interes", "préstamo", "prestamo"] },
  { id: "sindicato", label: "Cuotas sindicales o asociaciones", kind: "predictable", keywords: ["sindicato", "asociación", "asociacion"] },
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function matchFixedSuggestion(
  rows: { concept: string; category: string | null; recurrence: string }[],
  suggestion: FixedExpenseSuggestion,
  canonicalConcept: (concept: string) => string,
): boolean {
  for (const r of rows) {
    if (r.recurrence === "none") continue;
    const blob = stripDiacritics(`${canonicalConcept(r.concept)} ${r.category ?? ""}`.toLowerCase());
    const normBlob = blob.replace(/[^a-z0-9áéíóúüñ\s]/gi, " ");
    for (const kw of suggestion.keywords) {
      const k = stripDiacritics(kw.toLowerCase());
      if (normBlob.includes(k)) return true;
    }
  }
  return false;
}
