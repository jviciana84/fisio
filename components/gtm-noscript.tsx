import { getGtmId } from "@/lib/analytics/ga-id";

/** Colocar inmediatamente tras abrir <body> (GTM, usuarios sin JavaScript). */
export function GtmNoscript() {
  const id = getGtmId();
  if (!id) return null;
  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
        height={0}
        width={0}
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
