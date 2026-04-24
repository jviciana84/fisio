import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import { LEGAL_PATHS, PUBLIC_LEGAL_IDENTITY as L } from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Condiciones de reserva, pago y cancelación",
  description:
    "Métodos de pago (Bizum, PayPal), confirmación de cita, cancelaciones y retrasos — Fisioterapia Roc Blanc.",
  alternates: { canonical: "/condiciones-reserva-pago-cancelacion" },
};

export default function CondicionesReservaPage() {
  return (
    <LegalDocumentLayout title="Condiciones de reserva, pago y cancelación">
      <p>
        Las siguientes condiciones regulan la reserva de citas y la contratación de servicios a través de los canales de{" "}
        {L.brand}.
      </p>

      <h2>A. Métodos de pago</h2>
      <p>
        <strong>Bizum.</strong> El pago se realizará al número <strong>{L.bizumNumber}</strong>. Es imprescindible
        indicar el nombre del paciente y la fecha de la cita en el concepto del pago.
      </p>
      <p>
        <strong>PayPal.</strong> El pago se realizará a través de la pasarela segura integrada en la web cuando así esté
        disponible.
      </p>
      <p>
        <strong>Confirmación.</strong> La cita no se considerará confirmada hasta que se verifique la recepción del pago
        o el justificante del mismo por parte del centro.
      </p>

      <h2>B. Política de cancelación</h2>
      <p>
        <strong>Cambios o cancelaciones:</strong> deberán comunicarse con un mínimo de <strong>24 horas</strong> de
        antelación respecto a la hora de la cita.
      </p>
      <p>
        <strong>Cancelaciones con antelación (más de 24 h):</strong> se procederá a la devolución íntegra del importe o
        a la reubicación de la cita sin coste adicional, según acuerdo con el centro.
      </p>
      <p>
        <strong>Cancelaciones tardías o inasistencia (menos de 24 h):</strong> no se realizará el reembolso del importe
        abonado, ya que ese tiempo ha sido reservado exclusivamente para usted y no ha podido ser aprovechado por otro
        paciente.
      </p>

      <h2>C. Retrasos</h2>
      <p>
        En caso de que el paciente llegue tarde, el tiempo de la sesión se verá reducido para no perjudicar la
        puntualidad de los siguientes pacientes, cobrándose la sesión completa.
      </p>

      <p className="text-sm text-slate-600">
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.privacy}>
          Política de privacidad
        </a>
        {" · "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.legalNotice}>
          Aviso legal
        </a>
      </p>
    </LegalDocumentLayout>
  );
}
