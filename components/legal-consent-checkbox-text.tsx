"use client";

import Link from "next/link";
import { LEGAL_PATHS } from "@/lib/legal-public";

const linkClass =
  "font-semibold text-blue-700 underline decoration-blue-300 underline-offset-1 hover:text-blue-900";

/** Consentimiento RGPD + condiciones de reserva/pago/cancelación. */
export function LegalConsentCheckboxText() {
  return (
    <span className="min-w-0 flex-1 text-left text-[11px] leading-snug text-slate-700 sm:text-xs">
      He leído y acepto la{" "}
      <Link href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Política de Privacidad
      </Link>
      {" "}y las{" "}
      <Link
        href={LEGAL_PATHS.bookingPaymentCancel}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Condiciones de reserva, pago y cancelación
      </Link>
      .
    </span>
  );
}
