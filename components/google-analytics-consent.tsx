"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getGaMeasurementId, getGtmId } from "@/lib/analytics/ga-id";
import { isPublicMarketingSurfacePath } from "@/lib/analytics/public-paths";
import { COOKIE_CONSENT_STORAGE_KEY, getStoredCookieConsent } from "@/lib/cookie-consent";

const CONSENT_DEFAULT_SNIPPET = `(function(w){
w.dataLayer=w.dataLayer||[];
w.gtag=function gtag(){w.dataLayer.push(arguments);};
w.gtag('js', new Date());
w.gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  personalization_storage:'denied',
  security_storage:'granted',
  wait_for_update:500
});
})(window);`;

const GTM_BUNDLE_SNIPPET = `${CONSENT_DEFAULT_SNIPPET}
(function(w){
w.dataLayer=w.dataLayer||[];
w.dataLayer.push({'gtm.start': new Date().getTime(), event:'gtm.js'});
})(window);`;

function subscribeToConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const run = () => onStoreChange();
  window.addEventListener("frb:cookie-consent-updated", run);
  const onStorage = (e: StorageEvent) => {
    if (e.key === COOKIE_CONSENT_STORAGE_KEY || e.key == null) run();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("frb:cookie-consent-updated", run);
    window.removeEventListener("storage", onStorage);
  };
}

function readAnalyticsGranted(): boolean {
  return getStoredCookieConsent()?.analytics === true;
}

function getServerSnapshotAnalytics(): boolean {
  return false;
}

function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined" || !window.gtag) return;
  if (granted) {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
    });
  } else {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
    });
  }
}

type TagProps = { containerId: string; mode: "gtm" | "ga" };

/**
 * gtag/GA4 directo, o (mode gtm) Google Tag Manager: mismo Consent Mode, `page_view` vía gtag.
 */
function TagsClient({ containerId, mode }: TagProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublic = isPublicMarketingSurfacePath(pathname);
  const [configReady, setConfigReady] = useState(false);
  const consentGranted = useSyncExternalStore(
    subscribeToConsent,
    readAnalyticsGranted,
    getServerSnapshotAnalytics,
  );

  const query = searchParams.toString();
  const pagePath = query ? `${pathname}?${query}` : pathname;

  useEffect(() => {
    if (!isPublic || !configReady) return;
    updateGtagConsent(consentGranted);
    if (!consentGranted) return;
    window.gtag?.("event", "page_view", {
      page_path: pagePath,
      page_title: typeof document !== "undefined" ? document.title : pagePath,
      page_location: typeof window !== "undefined" ? window.location.href : pagePath,
    });
  }, [isPublic, configReady, consentGranted, pagePath, pathname, query]);

  if (!isPublic) return null;

  if (mode === "gtm") {
    return (
      <>
        <Script
          id="frb-gtm-consent-and-start"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: GTM_BUNDLE_SNIPPET }}
        />
        <Script
          id="frb-gtm-js"
          src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`}
          strategy="afterInteractive"
          onLoad={() => {
            setConfigReady(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Script
        id="frb-consent-datalayer"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SNIPPET }}
      />
      <Script
        id="frb-ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(containerId)}`}
        strategy="afterInteractive"
        onLoad={() => {
          window.gtag("config", containerId, { send_page_view: false, anonymize_ip: true });
          setConfigReady(true);
        }}
      />
    </>
  );
}

/**
 * GTM (NEXT_PUBLIC_GTM_ID) manda: GA4, Ads, lo que tengas en el contenedor.
 * Sin GTM, se carga gtag/GA4 si existe NEXT_PUBLIC_GA_MEASUREMENT_ID.
 */
export function GoogleAnalyticsConsent() {
  const gtm = getGtmId();
  if (gtm) {
    return <TagsClient key="gtm" containerId={gtm} mode="gtm" />;
  }
  const ga = getGaMeasurementId();
  if (ga) {
    return <TagsClient key="ga" containerId={ga} mode="ga" />;
  }
  return null;
}
