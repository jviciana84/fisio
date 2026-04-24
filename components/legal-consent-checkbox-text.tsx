"use client";

import Link from "next/link";
import { LEGAL_PATHS } from "@/lib/legal-public";

const linkClass =
  "font-semibold text-blue-700 underline decoration-blue-300 underline-offset-1 hover:text-blue-900";

/** Consentimiento corto: solo política de privacidad; cabe en una línea en formularios habituales. */
export function LegalConsentCheckboxText() {
  return (
    <span className="min-w-0 flex-1 text-left text-[11px] leading-snug text-slate-700 sm:text-xs">
      He leído y acepto la{" "}
      <Link href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Política de Privacidad
      </Link>
      .
    </span>
  );
}
