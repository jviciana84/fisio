"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPublicMarketingSurfacePath } from "@/lib/analytics/public-paths";
import { cn } from "@/lib/cn";
import { COOKIE_CATALOG, hasValidCookieChoice, saveCookieConsent } from "@/lib/cookie-consent";

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
  const titleId = useId();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const applyChoice = useCallback((choice: "all" | "necessary" | "reject") => {
    saveCookieConsent(choice);
    setSettingsOpen(false);
    setExpanded(false);
  }, []);

  useEffect(() => {
    const onUpdate = () => {
      setSettingsOpen(false);
      setExpanded(false);
    };
    const onOpen = () => {
      if (hasValidCookieChoice()) {
        setSettingsOpen(true);
        setExpanded(true);
      } else {
        setExpanded(true);
      }
    };
    window.addEventListener("frb:cookie-consent-updated", onUpdate);
    window.addEventListener("frb:open-cookie-settings", onOpen);
    return () => {
      window.removeEventListener("frb:cookie-consent-updated", onUpdate);
      window.removeEventListener("frb:open-cookie-settings", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSettingsOpen(false);
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  if (!isClient || !publicZone) return null;

  const showInitialBanner = !hasValidChoice;

  return (
    <>
      {showInitialBanner ? (
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
                    <span className="font-medium text-slate-800">Uso de cookies</span> - Utilizamos cookies propias
                    tecnicas y, si nos las permite, otras de mejora del sitio. Puede aceptar todas, limitarse a las
                    necesarias o rechazar las opcionales.{" "}
                    <a className="font-medium text-blue-700 hover:underline" href="/politica-cookies">
                      Mas informacion
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
                    {expanded ? "Ocultar que usamos" : "Ver tipos de cookies y ejemplos"}
                  </button>
                </div>
              </div>

              <div className="grid w-full min-w-0 [grid-template-columns:1fr_1fr_1fr] gap-1.5 sm:max-w-md sm:shrink-0 sm:self-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyChoice("reject")}
                  className="h-8 min-w-0 border-0 bg-gradient-to-r from-blue-600 to-cyan-500 px-1.5 text-[0.7rem] text-white shadow-sm shadow-blue-500/15 hover:from-blue-700 hover:to-cyan-600 sm:px-2 sm:text-xs"
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

            {expanded ? (
              <div
                id={panelId}
                className="mt-2.5 max-h-52 overflow-y-auto rounded-lg border border-slate-200/80 bg-white/70 p-3 text-left text-[0.7rem] text-slate-600 sm:max-h-64 sm:mt-3 sm:text-xs"
              >
                <ul className="space-y-3">
                  {COOKIE_CATALOG.map((c) => (
                    <li key={c.id}>
                      <p className="font-semibold text-slate-800">
                        {c.name}
                        {c.alwaysOn ? (
                          <span className="ml-1.5 text-[0.7rem] font-normal text-slate-500">(siempre activas)</span>
                        ) : null}
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
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!showInitialBanner && settingsOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-slate-900/25 backdrop-blur-[2px]"
            aria-label="Cerrar preferencias de cookies"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-[max(1rem,env(safe-area-inset-left))] z-[85] w-[min(calc(100vw-2rem),22rem)] max-h-[min(70vh,32rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex max-h-[min(70vh,32rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-3.5 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/12 to-cyan-500/10"
                aria-hidden
              >
                <Cookie className="size-4 text-blue-600" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p id={titleId} className="text-sm font-semibold text-slate-800">
                  Cookies
                </p>
                <p className="text-[0.65rem] leading-tight text-slate-500 sm:text-xs">
                  {hasValidChoice ? "Puede cambiar su elección cuando quiera." : "Configure o acepte para continuar."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 text-xs text-slate-600 sm:px-4 sm:text-sm">
            <p className="text-pretty leading-snug text-slate-700">
              Cookies técnicas y, si lo permite, de mejora del sitio.{" "}
              <a className="font-medium text-blue-700 hover:underline" href="/politica-cookies">
                Más información
              </a>
            </p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-0.5 text-left text-[0.7rem] font-medium text-slate-500 transition-colors hover:text-blue-600 sm:text-xs"
              aria-expanded={expanded}
              aria-controls={panelId}
            >
              {expanded ? (
                <ChevronUp className="size-3 shrink-0" aria-hidden />
              ) : (
                <ChevronDown className="size-3 shrink-0" aria-hidden />
              )}
              {expanded ? "Ocultar detalle" : "Ver tipos y ejemplos"}
            </button>

            {expanded ? (
              <div
                id={panelId}
                className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/80 p-2.5 text-[0.7rem] sm:max-h-48 sm:text-xs"
              >
                <ul className="space-y-2.5">
                  {COOKIE_CATALOG.map((c) => (
                    <li key={c.id}>
                      <p className="font-semibold text-slate-800">
                        {c.name}
                        {c.alwaysOn ? (
                          <span className="ml-1 font-normal text-slate-500">(siempre activas)</span>
                        ) : null}
                      </p>
                      <p className="mt-1 leading-relaxed">{c.description}</p>
                      {c.examples?.length ? (
                        <p className="mt-1 text-slate-500">
                          <span className="font-medium text-slate-600">Ejemplos: </span>
                          {c.examples.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:px-3.5">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <Button
                type="button"
                size="sm"
                onClick={() => applyChoice("reject")}
                className="h-8 border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-[0.7rem] text-white shadow-sm hover:from-blue-700 hover:to-cyan-600 sm:text-xs"
              >
                Rechazar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyChoice("necessary")}
                className="h-8 border-slate-200 bg-white/90 text-[0.7rem] sm:text-xs"
              >
                Solo necesarias
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-[0.7rem] text-white shadow-sm hover:from-blue-700 hover:to-cyan-600 sm:text-xs"
                onClick={() => applyChoice("all")}
              >
                Aceptar todas
              </Button>
            </div>
          </div>
            </div>
          </div>
        </>
      ) : null}

      {!showInitialBanner ? (
        <button
          type="button"
          onClick={() => {
            setSettingsOpen((o) => {
              if (o) setExpanded(false);
              return !o;
            });
          }}
          className={cn(
            "fixed z-[90] flex size-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-md shadow-slate-900/8 backdrop-blur-sm transition hover:border-slate-300 hover:text-blue-600 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
            "left-[max(1rem,env(safe-area-inset-left))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
            settingsOpen && "border-blue-200/80 text-blue-600 ring-2 ring-blue-500/20",
          )}
          aria-label={settingsOpen ? "Cerrar preferencias de cookies" : "Preferencias de cookies"}
          aria-expanded={settingsOpen}
          aria-haspopup="dialog"
        >
          <Cookie className="size-[1.35rem]" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </>
  );
}
