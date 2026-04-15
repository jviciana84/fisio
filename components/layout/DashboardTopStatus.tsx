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

export function DashboardTopStatus({
  userName,
}: {
  userName: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = useMemo(() => formatClock(now), [now]);

  return (
    <div className="pointer-events-none fixed right-4 top-3 z-40 sm:right-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/55 bg-white/70 px-3 py-2 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Sesión</p>
          <p className="max-w-[10rem] truncate text-xs font-semibold text-slate-800">
            {userName}
          </p>
        </div>
        <div className="h-7 w-px bg-slate-200" aria-hidden />
        <div className="text-right">
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
