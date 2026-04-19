"use client";

import { Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }, [router]);

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
    <div className="pointer-events-none fixed left-1/2 top-3 z-40 flex w-[min(100vw-1rem,32rem)] -translate-x-1/2 justify-center sm:top-4">
      <div className="pointer-events-auto flex w-full max-w-md items-stretch justify-center gap-0 rounded-xl border border-white/55 bg-white/70 px-2 py-2 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-3">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-1.5 text-center sm:px-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Sesión</p>
          <p className="truncate text-xs font-semibold text-slate-800" title={userName}>
            {userName}
          </p>
        </div>
        <div className="my-1 w-px shrink-0 self-stretch bg-slate-200/90" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-1.5 text-center sm:px-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Tiempo conectado</p>
          <p
            className="font-mono text-xs font-semibold tabular-nums text-slate-900 sm:text-sm"
            suppressHydrationWarning
            title={sessionIssuedAtIso ? `Desde ${new Date(sessionIssuedAtIso).toLocaleString("es-ES")}` : undefined}
          >
            {connectedLabel}
          </p>
        </div>
        <div className="my-1 w-px shrink-0 self-stretch bg-slate-200/90" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-1.5 text-center sm:px-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Hora</p>
          <p
            className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900"
            suppressHydrationWarning
          >
            {clock}
          </p>
        </div>
        <div className="my-1 w-px shrink-0 self-stretch bg-slate-200/90" aria-hidden />
        <div className="flex shrink-0 items-center justify-center px-2 sm:px-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white/80 text-slate-600 shadow-sm transition",
              "hover:border-red-200 hover:bg-red-50 hover:text-red-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            title={loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            aria-label={loggingOut ? "Cerrando sesión" : "Cerrar sesión"}
          >
            <Power className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
