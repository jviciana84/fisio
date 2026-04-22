"use client";

import { Coins, Power, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CashRegisterCard } from "@/components/dashboard/CashRegisterCard";
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
  enablePinSwitch = false,
}: {
  userName: string;
  /** Inicio de sesión (JWT `iat`), ISO 8601 */
  sessionIssuedAtIso: string | null;
  /** Staff: muestra PIN para cambiar de usuario sin salir al login. */
  enablePinSwitch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [switchPin, setSwitchPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState(false);
  const pinAttemptLock = useRef(false);

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

  const openCash = useCallback(() => {
    if (pathname === "/dashboard") {
      const target = document.getElementById("caja");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      router.push("/dashboard#caja");
      return;
    }
    setCashModalOpen(true);
  }, [pathname, router]);

  const trySwitchUser = useCallback(
    async (pin: string) => {
      if (!/^\d{4}$/.test(pin) || pinAttemptLock.current) return;
      pinAttemptLock.current = true;
      setPinBusy(true);
      setPinError(false);
      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          message?: string;
          requiresTwoFactor?: boolean;
          requiresTotpOnboarding?: boolean;
          redirectTo?: string;
        };

        setSwitchPin("");

        if (!res.ok || !data.ok) {
          setPinError(true);
          window.setTimeout(() => setPinError(false), 1600);
          return;
        }

        if (data.requiresTotpOnboarding) {
          router.push(data.redirectTo ?? "/onboarding/totp");
          return;
        }

        if (data.requiresTwoFactor) {
          router.push("/login");
          return;
        }

        router.push(data.redirectTo ?? "/dashboard");
        router.refresh();
      } finally {
        pinAttemptLock.current = false;
        setPinBusy(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (switchPin.length !== 4) return;
    void trySwitchUser(switchPin);
  }, [switchPin, trySwitchUser]);

  const colClass =
    "flex min-w-0 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-slate-200/90 px-2 py-1 text-center";
  const colFixed = cn(colClass, "shrink-0");

  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-40 flex w-max max-w-[min(100vw-0.75rem,44rem)] -translate-x-1/2 items-center gap-2 sm:top-4">
        <div className="pointer-events-auto inline-flex max-w-full items-stretch rounded-lg border border-white/55 bg-white/75 px-1 py-0.5 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.42)] backdrop-blur-xl">
          {enablePinSwitch ? (
            <form
              className={colFixed}
              onSubmit={(e) => {
                e.preventDefault();
                void trySwitchUser(switchPin);
              }}
            >
              <label htmlFor="session-switch-pin" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                PIN
              </label>
              <input
                id="session-switch-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={switchPin}
                disabled={pinBusy}
                onChange={(e) => setSwitchPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                title="Introduce el PIN de otro usuario para cambiar la sesión"
                aria-invalid={pinError}
                className={cn(
                  "box-border h-6 w-[3.75rem] rounded-md border bg-white/95 px-1 text-center font-mono text-[13px] leading-none tracking-[0.28em] text-slate-900 outline-none placeholder:tracking-normal",
                  pinError ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200/90",
                  "focus:border-blue-400 focus:ring-1 focus:ring-blue-100",
                  "disabled:opacity-50",
                )}
              />
            </form>
          ) : null}

          <div className={cn(colClass, "max-w-[7rem] sm:max-w-[8rem]")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sesión</p>
            <p className="w-full truncate text-xs font-semibold leading-tight text-slate-800" title={userName}>
              {userName}
            </p>
          </div>
          <div
            className={colFixed}
            title={
              sessionIssuedAtIso
                ? `Desde ${new Date(sessionIssuedAtIso).toLocaleString("es-ES")}`
                : undefined
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conectado</p>
            <p
              className="font-mono text-sm font-semibold tabular-nums leading-none text-slate-900"
              suppressHydrationWarning
            >
              {connectedLabel}
            </p>
          </div>
          <div className={colFixed}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hora</p>
            <p
              className="font-mono text-sm font-semibold tabular-nums leading-none text-slate-900"
              suppressHydrationWarning
            >
              {clock}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-center self-stretch px-0.5">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white/80 text-slate-600 shadow-sm transition",
                "hover:border-red-200 hover:bg-red-50 hover:text-red-700",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              title={loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              aria-label={loggingOut ? "Cerrando sesión" : "Cerrar sesión"}
            >
              <Power className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={openCash}
          className={cn(
            "pointer-events-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_12px_24px_-14px_rgba(37,99,235,0.9)] transition",
            "hover:brightness-105",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
          )}
          title={pathname === "/dashboard" ? "Ir a caja" : "Abrir caja"}
          aria-label={pathname === "/dashboard" ? "Ir a caja" : "Abrir caja"}
        >
          <Coins className="h-4 w-4" />
        </button>
      </div>

      {cashModalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Caja rápida"
          onClick={() => setCashModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-[1240px] overflow-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCashModalOpen(false)}
              className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white/90 text-slate-600 shadow-sm transition hover:bg-slate-100"
              title="Cerrar caja"
              aria-label="Cerrar caja"
            >
              <X className="h-4 w-4" />
            </button>
            <CashRegisterCard />
          </div>
        </div>
      ) : null}
    </>
  );
}
