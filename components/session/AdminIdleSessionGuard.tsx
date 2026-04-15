"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 15 minutos sin actividad antes del aviso (estilo banca). */
const IDLE_MS = 15 * 60 * 1000;
/** Tiempo para pulsar «Continuar» antes del cierre automático. */
const GRACE_MS = 60 * 1000;

export function AdminIdleSessionGuard({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());
  const graceEndRef = useRef<number | null>(null);
  const showWarningRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  const continueSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    graceEndRef.current = null;
    showWarningRef.current = false;
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let throttleUntil = 0;
    const onActivity = () => {
      if (showWarningRef.current) return;
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + 1000;
      lastActivityRef.current = now;
    };

    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "mousemove",
    ];
    events.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true }),
    );

    const interval = window.setInterval(() => {
      const now = Date.now();

      if (showWarningRef.current) {
        const end = graceEndRef.current;
        if (end !== null && now >= end) {
          void logout();
          return;
        }
        if (end !== null) {
          setSecondsLeft(Math.max(0, Math.ceil((end - now) / 1000)));
        }
        return;
      }

      if (now - lastActivityRef.current >= IDLE_MS) {
        graceEndRef.current = now + GRACE_MS;
        showWarningRef.current = true;
        setSecondsLeft(Math.max(1, Math.ceil(GRACE_MS / 1000)));
        setShowWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.clearInterval(interval);
    };
  }, [enabled, logout]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showWarning ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-session-title"
          aria-describedby="idle-session-desc"
        >
          <div className="glass-panel-strong w-full max-w-md p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⏱
            </div>
            <h2
              id="idle-session-title"
              className="text-center text-lg font-semibold text-slate-900"
            >
              ¿Sigues ahí?
            </h2>
            <p
              id="idle-session-desc"
              className="mt-3 text-center text-sm text-slate-600"
            >
              Por seguridad, la sesión de administrador se cerrará si no
              confirmas que continúas trabajando.
            </p>
            <p className="mt-4 text-center text-3xl font-semibold tabular-nums text-blue-600">
              {secondsLeft}
              <span className="text-lg font-normal text-slate-500"> s</span>
            </p>
            <button
              type="button"
              onClick={continueSession}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:opacity-95"
            >
              Continuar sesión (15 min más)
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Si no haces nada, volverás al inicio de sesión.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
