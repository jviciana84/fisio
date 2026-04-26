"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPublicMarketingSurfacePath } from "@/lib/analytics/public-paths";
import { cn } from "@/lib/cn";
import {
  COOKIE_CATALOG,
  hasValidCookieChoice,
  saveCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";

const noopSubscribe = () => () => {};
function readHasValidFromStorage() {
  return hasValidCookieChoice();
}
function getServerValidSnapshot() {
  return true;
}

export function CookieConsentBar() {
  const pathname = usePathname();
  const publicZone = isPublicMarketingSurfacePath(pathname);
  const panelId = useId();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [forcePanel, setForcePanel] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasValidChoice = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const run = () => onStoreChange();
      window.addEventListener("storage", run);
      window.addEventListener("frb:cookie-consent-updated", run);
      return () => {
        window.removeEventListener("storage", run);
        window.removeEventListener("frb:cookie-consent-updated", run);
      };
    },
    readHasValidFromStorage,
    getServerValidSnapshot,
  );

  const shouldShow = isClient && publicZone && (!hasValidChoice || forcePanel);

  const applyChoice = useCallback(
    (choice: "all" | "necessary") => {
      saveCookieConsent(choice === "all" ? "all" : "necessary");
      setForcePanel(false);
    },
    [],
  );

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<CookieConsentValue>;
      if (ce.detail) setForcePanel(false);
    };
    const onOpen = () => {
      setForcePanel(true);
      setExpanded(true);
    };
    window.addEventListener("frb:cookie-consent-updated", onUpdate);
    window.addEventListener("frb:open-cookie-settings", onOpen);
    return () => {
      window.removeEventListener("frb:cookie-consent-updated", onUpdate);
      window.removeEventListener("frb:open-cookie-settings", onOpen);
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200/80 bg-slate-50/95 shadow-[0_-4px_24px_rgba(15,23,42,0.12)] backdrop-blur-md"
      role="region"
      aria-label="Aviso de cookies"
    >
      <div className="container mx-auto px-3 py-2.5 sm:px-4 sm:py-3">
        <div
          className={cn(
            "flex flex-col gap-2.5 text-xs text-slate-600 sm:text-sm",
            "sm:flex-row sm:items-stretch sm:justify-between sm:gap-4",
          )}
        >
          <div className="flex min-w-0 flex-1 gap-2.5">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 sm:size-9"
              aria-hidden
            >
              <Cookie className="size-3.5 text-blue-600 sm:size-4" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-pretty leading-snug text-slate-700">
                <span className="font-medium text-slate-800">Uso de cookies</span> — Utilizamos cookies propias
                técnicas y, si nos las permite, otras de mejora del sitio. Puede aceptar todas, limitarse a las
                necesarias o rechazar las opcionales.{" "}
                <a
                  className="font-medium text-blue-700 hover:underline"
                  href="/politica-cookies"
                >
                  Más información
                </a>
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-0.5 text-left text-[0.7rem] font-medium text-slate-500 transition-colors hover:text-blue-600 sm:text-xs"
                aria-expanded={expanded}
                aria-controls={panelId}
              >
                {expanded ? (
                  <ChevronUp className="size-3 shrink-0" aria-hidden />
                ) : (
                  <ChevronDown className="size-3 shrink-0" aria-hidden />
                )}
                {expanded ? "Ocultar qué usamos" : "Ver tipos de cookies y ejemplos"}
              </button>
            </div>
          </div>

          <div className="grid w-full min-w-0 [grid-template-columns:1fr_1fr_1fr] gap-1.5 sm:max-w-md sm:shrink-0 sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyChoice("necessary")}
              className="h-8 min-w-0 border border-transparent px-1.5 text-[0.7rem] text-slate-600 transition-none hover:!bg-transparent hover:text-slate-600 dark:hover:!bg-transparent sm:px-2 sm:text-xs"
            >
              Rechazar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyChoice("necessary")}
              className="h-8 min-w-0 border-slate-200 bg-white/80 px-1.5 text-[0.7rem] sm:px-2 sm:text-xs"
            >
              Solo necesarias
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 min-w-0 border-0 bg-gradient-to-r from-blue-600 to-cyan-500 px-1.5 text-[0.7rem] text-white shadow-sm shadow-blue-500/15 hover:from-blue-700 hover:to-cyan-600 sm:px-2 sm:text-xs"
              onClick={() => applyChoice("all")}
            >
              Aceptar todas
            </Button>
          </div>
        </div>

        {expanded && (
          <div
            id={panelId}
            className="mt-2.5 max-h-52 overflow-y-auto rounded-lg border border-slate-200/80 bg-white/70 p-3 text-left text-[0.7rem] text-slate-600 sm:max-h-64 sm:mt-3 sm:text-xs"
          >
            <ul className="space-y-3">
              {COOKIE_CATALOG.map((c) => (
                <li key={c.id}>
                  <p className="font-semibold text-slate-800">
                    {c.name}
                    {c.alwaysOn && (
                      <span className="ml-1.5 text-[0.7rem] font-normal text-slate-500">(siempre activas)</span>
                    )}
                  </p>
                  <p className="mt-1.5 text-pretty leading-relaxed">{c.description}</p>
                  {c.examples?.length ? (
                    <p className="mt-1.5 text-slate-500">
                      <span className="font-medium text-slate-600">Ejemplos: </span>
                      {c.examples.join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-slate-200 pt-3 text-slate-500">
              <span className="font-medium">Almacenamiento: </span>
              Su elección se guarda en el navegador (local) para no volver a preguntar en este dispositivo. Puede
              modificarla desde la{" "}
              <a className="font-medium text-blue-700 hover:underline" href="/politica-cookies">
                Política de cookies
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
