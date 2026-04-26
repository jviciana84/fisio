import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import { OpenCookiePreferencesButton } from "@/components/open-cookie-preferences-button";
import { LEGAL_PATHS } from "@/lib/legal-public";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Uso de cookies técnicas y analíticas en el sitio web de Fisioterapia Roc Blanc.",
  alternates: { canonical: "/politica-cookies" },
};

export default function PoliticaCookiesPage() {
  return (
    <LegalDocumentLayout title="Política de cookies">
      <p>Este sitio web utiliza cookies para mejorar la navegación y el funcionamiento de los servicios ofrecidos.</p>

      <h2>Cookies técnicas</h2>
      <p>
        Son imprescindibles para el funcionamiento de la web, la seguridad de la sesión y, cuando proceda, la pasarela de
        pagos o la finalización de reservas.
      </p>

      <h2>Cookies analíticas</h2>
      <p>Nos permiten medir el número de visitas de forma agregada o anónima para mejorar el sitio.</p>

      <h2>Gestión</h2>
      <p>
        Puede configurar su navegador para aceptar o rechazar las cookies, o para que le avise antes de almacenarlas. Sin
        las cookies técnicas necesarias, algunas funciones de pago o reserva podrían no funcionar correctamente.
      </p>

      <div className="not-prose flex flex-col gap-3 sm:flex-row sm:items-center">
        <OpenCookiePreferencesButton className="w-fit border-slate-200 bg-white/80" />
        <span className="text-sm text-slate-500">
          Abre el aviso en la parte inferior de la pantalla para aceptar todas, solo las necesarias o rechazar las
          opcionales.
        </span>
      </div>

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
