/**
 * Guía educativa: deducibilidad orientativa por categoría (no es asesoramiento fiscal).
 */

export type DeductibilityKind = "full" | "partial" | "none";

export type CategoryHint = {
  defaultDeductibility: DeductibilityKind;
  defaultDeductiblePercent: number;
  title: string;
  explanation: string;
};

const KEYWORDS: { test: (c: string) => boolean; hint: CategoryHint }[] = [
  {
    test: (c) => /alquiler|local|arrend/i.test(c),
    hint: {
      defaultDeductibility: "full",
      defaultDeductiblePercent: 100,
      title: "Local y alquiler",
      explanation:
        "El alquiler del local donde ejerces la actividad suele ser plenamente deducible. Si compartes el espacio con uso personal, solo la parte proporcional a la actividad.",
    },
  },
  {
    test: (c) => /ibi|basuras|tasa/i.test(c),
    hint: {
      defaultDeductibility: "full",
      defaultDeductiblePercent: 100,
      title: "Impuestos del local",
      explanation:
        "IBI y tasas municipales relacionadas con el local de negocio suelen ser deducibles según criterio de afectación a la actividad.",
    },
  },
  {
    test: (c) => /luz|agua|gas|internet|telefon|suministro/i.test(c),
    hint: {
      defaultDeductibility: "partial",
      defaultDeductiblePercent: 50,
      title: "Suministros",
      explanation:
        "Luz, agua, internet o teléfono suelen prorratearse si el mismo contrato mezcla uso personal y profesional. Ajusta el % según horas o m² dedicados a la clínica.",
    },
  },
  {
    test: (c) => /aut[oó]nom|seg\.?\s*social|cuota/i.test(c),
    hint: {
      defaultDeductibility: "full",
      defaultDeductiblePercent: 100,
      title: "Cuota de autónomos",
      explanation:
        "Las cotizaciones a la Seguridad Social como autónomo son deducibles en el IRPF (con límites que marca la ley).",
    },
  },
  {
    test: (c) => /material|consum|sanit|gasas|desinfect|lencer/i.test(c),
    hint: {
      defaultDeductibility: "full",
      defaultDeductiblePercent: 100,
      title: "Material y consumibles",
      explanation:
        "Material sanitario, desechable o de un solo uso para la actividad suele ser deducible cuando está vinculado a la prestación del servicio.",
    },
  },
  {
    test: (c) => /seguro/i.test(c),
    hint: {
      defaultDeductibility: "partial",
      defaultDeductiblePercent: 80,
      title: "Seguros",
      explanation:
        "Seguros de responsabilidad civil, local o equipos usados en la actividad: deducibles en la parte que afecta al negocio.",
    },
  },
];

export function hintForCategory(category: string): CategoryHint | null {
  const c = category.trim().toLowerCase();
  if (!c) return null;
  for (const row of KEYWORDS) {
    if (row.test(c)) return row.hint;
  }
  return {
    defaultDeductibility: "full",
    defaultDeductiblePercent: 100,
    title: "Gasto general",
    explanation:
      "Revisa con tu gestor si el gasto está vinculado directamente a la actividad y conserva facturas. Algunos gastos personales o multas no son deducibles.",
  };
}
