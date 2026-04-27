import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import { LEGAL_PATHS, PUBLIC_LEGAL_IDENTITY as L } from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Tratamiento de datos personales y de salud conforme al RGPD en Fisioterapia Roc Blanc (Terrassa).",
  alternates: { canonical: "/politica-privacidad" },
};

export default function PoliticaPrivacidadPage() {
  return (
    <LegalDocumentLayout title="Política de privacidad y protección de datos">
      <p>
        <strong>{L.brand}</strong> garantiza la protección de los datos personales de sus pacientes de acuerdo con el
        Reglamento (UE) 2016/679 (RGPD) y la normativa española de protección de datos.
      </p>

      <h2>Responsable del tratamiento</h2>
      <p>
        <strong>{L.ownerFullName}</strong>, NIF/NIE <span className="tabular-nums">{L.taxId}</span>, en nombre de{" "}
        <strong>{L.brand}</strong>. <strong>Dirección:</strong> {L.addressLines.join(", ")}.{" "}
        <strong>Correo electrónico:</strong>{" "}
        <a className="font-medium text-blue-700 hover:underline" href={`mailto:${L.email}`}>
          {L.email}
        </a>
        . <strong>Teléfono:</strong>{" "}
        <a className="font-medium text-blue-700 hover:underline" href={`tel:${L.phoneTel}`}>
          {L.phoneDisplay}
        </a>
        .
      </p>

      <h2>Tratamiento de datos de salud</h2>
      <p>
        Al ser un centro de fisioterapia, tratamos datos de salud con estricta confidencialidad bajo el deber de secreto
        profesional y las medidas técnicas y organizativas adecuadas.
      </p>

      <h2>Finalidad</h2>
      <p>
        Los datos recogidos se usarán exclusivamente para la gestión de su historial clínico, la organización de citas y
        el cobro de los servicios, así como para responder a las consultas que nos formule por los canales habilitados.
      </p>

      <h2>Pagos</h2>
      <p>
        Para los pagos realizados mediante Bizum o PayPal, {L.brand} no almacena datos bancarios ni credenciales de pago.
        El proceso se realiza de forma externa y segura en dichas plataformas, conforme a sus propias políticas de
        privacidad.
      </p>

      <h2>Conservación</h2>
      <p>
        Los datos de la historia clínica se conservarán durante el periodo legal obligatorio (como mínimo, cinco años
        según la Ley 41/2002, básica reguladora del autonomía del paciente y de derechos y obligaciones en materia de
        información y documentación clínica), salvo que la normativa aplicable exija otro plazo.
      </p>

      <h2>Legitimación y destinatarios</h2>
      <p>
        La base jurídica incluye el consentimiento del interesado cuando proceda y la ejecución de la relación de
        prestación de servicios de salud. Los datos pueden comunicarse a plataformas de pago cuando usted utilice dichos
        medios, así como a terceros cuando exista obligación legal.
      </p>

      <h2>Derechos</h2>
      <p>
        Puede ejercitar sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición, así como
        retirar el consentimiento cuando este sea la base del tratamiento, mediante solicitud por escrito a{" "}
        <a className="font-medium text-blue-700 hover:underline" href={`mailto:${L.email}`}>
          {L.email}
        </a>{" "}
        adjuntando copia de su DNI o documento identificativo equivalente. También tiene derecho a reclamar ante la
        Agencia Española de Protección de Datos (
        <a
          className="font-medium text-blue-700 hover:underline"
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.aepd.es
        </a>
        ).
      </p>

      <p className="text-sm text-slate-600">
        Otros documentos:{" "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.legalNotice}>
          Aviso legal
        </a>
        {" · "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.bookingPaymentCancel}>
          Condiciones de reserva, pago y cancelación
        </a>
        {" · "}
        <a className="font-medium text-blue-700 hover:underline" href={LEGAL_PATHS.cookies}>
          Política de cookies
        </a>
      </p>
    </LegalDocumentLayout>
  );
}
