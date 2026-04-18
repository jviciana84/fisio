"use client";

import { useEffect, useMemo, useState } from "react";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatConnectedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p2 = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${p2(m)}m ${p2(s)}s`;
  if (m > 0) return `${m}m ${p2(s)}s`;
  return `${s}s`;
}

export function DashboardTopStatus({
  userName,
  sessionIssuedAtIso,
}: {
  userName: string;
  /** Inicio de sesión (JWT `iat`), ISO 8601 */
  sessionIssuedAtIso: string | null;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = useMemo(() => formatClock(now), [now]);

  const connectedMs = useMemo(() => {
    if (!sessionIssuedAtIso) return null;
    const start = new Date(sessionIssuedAtIso).getTime();
    if (Number.isNaN(start)) return null;
    return now.getTime() - start;
  }, [sessionIssuedAtIso, now]);

  const connectedLabel =
    connectedMs == null ? "—" : formatConnectedDuration(connectedMs);

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-40 flex w-[min(100vw-1rem,28rem)] -translate-x-1/2 justify-center sm:top-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-center gap-3 rounded-xl border border-white/55 bg-white/70 px-3 py-2 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:gap-4 sm:px-4">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Sesión</p>
          <p className="truncate text-xs font-semibold text-slate-800" title={userName}>
            {userName}
          </p>
        </div>
        <div className="h-9 w-px shrink-0 bg-slate-200" aria-hidden />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Tiempo conectado</p>
          <p
            className="font-mono text-xs font-semibold tabular-nums text-slate-900 sm:text-sm"
            suppressHydrationWarning
            title={sessionIssuedAtIso ? `Desde ${new Date(sessionIssuedAtIso).toLocaleString("es-ES")}` : undefined}
          >
            {connectedLabel}
          </p>
        </div>
        <div className="h-9 w-px shrink-0 bg-slate-200" aria-hidden />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Hora</p>
          <p
            className="font-mono text-sm font-semibold tabular-nums text-slate-900"
            suppressHydrationWarning
          >
            {clock}
          </p>
        </div>
      </div>
    </div>
  );
}
