import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import { LEGAL_PATHS, PUBLIC_LEGAL_IDENTITY as L } from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Datos identificativos del titular y condiciones de uso del sitio web de Fisioterapia Roc Blanc.",
  alternates: { canonical: "/aviso-legal" },
};

export default function AvisoLegalPage() {
  return (
    <LegalDocumentLayout title="Aviso legal">
      <p>
        En cumplimiento de la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio
        electrónico (LSSI-CE), se facilitan los datos identificativos del titular:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {L.ownerFullName}
        </li>
        <li>
          <strong>CIF/NIF:</strong> {L.taxId}
        </li>
        <li>
          <strong>Dirección:</strong> {L.addressLines.join(", ")}
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a className="font-medium text-blue-700 hover:underline" href={`mailto:${L.email}`}>
            {L.email}
          </a>
        </li>
        <li>
          <strong>Teléfono:</strong>{" "}
          <a className="font-medium text-blue-700 hover:underline" href={`tel:${L.phoneTel}`}>
            {L.phoneDisplay}
          </a>
        </li>
        <li>
          <strong>Datos profesionales:</strong> Fisioterapeuta colegiado nº {L.collegiateNumber} por el Colegio de
          Fisioterapeutas de {L.collegiateRegion}.
        </li>
      </ul>
      <p>
        El uso de este sitio web atribuye la condición de usuario e implica la aceptación de todas las condiciones
        incluidas en este Aviso Legal, en la{" "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.privacy}>
          Política de Privacidad
        </a>
        , en las{" "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.bookingPaymentCancel}>
          Condiciones de reserva, pago y cancelación
        </a>{" "}
        y en la{" "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.cookies}>
          Política de cookies
        </a>
        , en la medida en que resulten de aplicación.
      </p>
    </LegalDocumentLayout>
  );
}
