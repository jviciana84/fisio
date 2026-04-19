"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Mismo isotipo que la web pública (`components/header.tsx`). */
const LOGO_FRB3_SRC = "/images/logo%20FRB3.svg";

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BanknoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

/** Gastos (salida de caja) — icono distinto de ingresos */
function WalletOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15v-4" />
      <path d="M18 12h.01" />
    </svg>
  );
}

function UsersPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="m21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}

export function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [configOpen, setConfigOpen] = useState(() =>
    pathname.startsWith("/dashboard/configuracion"),
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const expanded = hovered;

  useEffect(() => {
    if (pathname.startsWith("/dashboard/configuracion")) {
      setConfigOpen(true);
    }
  }, [pathname]);

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

  const itemBase =
    "flex items-center rounded-xl py-2.5 text-sm font-medium text-slate-800 transition";

  return (
    <aside
      className={cn(
        "relative z-20 flex min-h-screen shrink-0 flex-col overflow-hidden",
        "border-r border-white/45 bg-white/20 shadow-[0_8px_32px_rgba(30,64,175,0.12)] backdrop-blur-2xl",
        "transition-[width] duration-300 ease-out",
        expanded ? "w-64" : "w-[4.25rem]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-white/35",
          expanded ? "gap-3 px-4 py-4" : "justify-center px-2 py-4",
        )}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full glass-extreme p-1">
          <img
            src={LOGO_FRB3_SRC}
            alt="Logo Fisioterapia Roc Blanc - Centro de fisioterapia en Terrassa"
            width={1000}
            height={1286}
            className="h-full w-full object-contain object-center [image-rendering:auto]"
            decoding="async"
          />
        </div>
        <div
          className={cn(
            "min-w-0 overflow-hidden transition-all duration-300",
            expanded ? "max-w-[11rem] opacity-100" : "max-w-0 opacity-0",
          )}
        >
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fisioterapia Roc Blanc
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">Panel</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <Link
          href="/dashboard"
          className={cn(
            itemBase,
            expanded ? "gap-3 px-2" : "justify-center px-0",
            pathname === "/dashboard"
              ? "bg-white/40 text-slate-900 shadow-sm"
              : "hover:bg-white/30",
          )}
          title={expanded ? undefined : "Inicio"}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
            <HomeIcon />
          </span>
          <span
            className={cn(
              "whitespace-nowrap",
              expanded ? "opacity-100" : "sr-only",
            )}
          >
            Inicio
          </span>
        </Link>

        {isAdmin ? (
          <>
            <Link
              href="/dashboard/ingresos"
              className={cn(
                itemBase,
                expanded ? "gap-3 px-2" : "justify-center px-0",
                pathname.startsWith("/dashboard/ingresos")
                  ? "bg-white/40 text-slate-900 shadow-sm"
                  : "hover:bg-white/30",
              )}
              title={expanded ? undefined : "Ingresos"}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
                <BanknoteIcon />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap",
                  expanded ? "opacity-100" : "sr-only",
                )}
              >
                Ingresos
              </span>
            </Link>

            <Link
              href="/dashboard/gastos"
              className={cn(
                itemBase,
                expanded ? "gap-3 px-2" : "justify-center px-0",
                pathname.startsWith("/dashboard/gastos")
                  ? "bg-white/40 text-slate-900 shadow-sm"
                  : "hover:bg-white/30",
              )}
              title={expanded ? undefined : "Gastos"}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-rose-800">
                <WalletOutIcon />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap",
                  expanded ? "opacity-100" : "sr-only",
                )}
              >
                Gastos
              </span>
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard#caja"
            className={cn(
              itemBase,
              expanded ? "gap-3 px-2" : "justify-center px-0",
              pathname === "/dashboard"
                ? "bg-white/40 text-slate-900 shadow-sm"
                : "hover:bg-white/30",
            )}
            title={expanded ? undefined : "Caja"}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-emerald-800">
              <BanknoteIcon />
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                expanded ? "opacity-100" : "sr-only",
              )}
            >
              Caja
            </span>
          </Link>
        )}

        {isAdmin ? (
          <Link
            href="/dashboard/fiscal"
            className={cn(
              itemBase,
              expanded ? "gap-3 px-2" : "justify-center px-0",
              pathname.startsWith("/dashboard/fiscal")
                ? "bg-white/40 text-slate-900 shadow-sm"
                : "hover:bg-white/30",
            )}
            title={expanded ? undefined : "Impuestos"}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
              <ReceiptIcon />
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                expanded ? "opacity-100" : "sr-only",
              )}
            >
              Impuestos
            </span>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/productos"
            className={cn(
              itemBase,
              expanded ? "gap-3 px-2" : "justify-center px-0",
              pathname.startsWith("/dashboard/productos")
                ? "bg-white/40 text-slate-900 shadow-sm"
                : "hover:bg-white/30",
            )}
            title={expanded ? undefined : "Productos"}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
              <PackageIcon />
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                expanded ? "opacity-100" : "sr-only",
              )}
            >
              Productos
            </span>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/staff"
            className={cn(
              itemBase,
              expanded ? "gap-3 px-2" : "justify-center px-0",
              pathname.startsWith("/dashboard/staff")
                ? "bg-white/40 text-slate-900 shadow-sm"
                : "hover:bg-white/30",
            )}
            title={expanded ? undefined : "Staff"}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
              <UsersIcon />
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                expanded ? "opacity-100" : "sr-only",
              )}
            >
              Staff
            </span>
          </Link>
        ) : null}

        {isAdmin && !expanded ? (
          <Link
            href="/dashboard/configuracion/usuarios"
            className={cn(
              itemBase,
              "justify-center px-0",
              pathname.startsWith("/dashboard/configuracion/usuarios")
                ? "bg-white/40 shadow-sm"
                : "hover:bg-white/30",
            )}
            title="Configuración — Alta de usuarios"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
              <GearIcon />
            </span>
            <span className="sr-only">Alta de usuarios</span>
          </Link>
        ) : null}

        {isAdmin && expanded ? (
          <div className="mt-1 space-y-0.5">
            <button
              type="button"
              onClick={() => setConfigOpen((v) => !v)}
              className={cn(
                itemBase,
                "w-full gap-2 px-2 text-left",
                pathname.startsWith("/dashboard/configuracion")
                  ? "bg-white/35 shadow-sm"
                  : "hover:bg-white/30",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30 text-blue-800">
                <GearIcon />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                Configuración
              </span>
              <ChevronDown
                className={cn(
                  "shrink-0 text-blue-800/70 transition-transform duration-200",
                  configOpen ? "rotate-180" : "",
                )}
              />
            </button>

            {configOpen ? (
              <div className="ml-5 space-y-0.5 border-l-2 border-blue-600/45 pl-4">
                <Link
                  href="/dashboard/configuracion/usuarios"
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm font-medium transition",
                    pathname.startsWith("/dashboard/configuracion/usuarios")
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm">
                    <UsersPlusIcon />
                  </span>
                  <span>Alta de usuarios</span>
                </Link>
                <Link
                  href="/dashboard/configuracion/productos"
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm font-medium transition",
                    pathname.startsWith("/dashboard/configuracion/productos")
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm">
                    <PackageIcon />
                  </span>
                  <span>Alta de productos</span>
                </Link>
                <Link
                  href="/dashboard/configuracion/gastos"
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm font-medium transition",
                    pathname.startsWith("/dashboard/configuracion/gastos")
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm">
                    <ReceiptIcon />
                  </span>
                  <span>Alta de gastos</span>
                </Link>
                <Link
                  href="/dashboard/configuracion/calendario"
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm font-medium transition",
                    pathname.startsWith("/dashboard/configuracion/calendario")
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm">
                    <CalendarIcon />
                  </span>
                  <span>Calendario Google</span>
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-white/35 p-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "flex w-full items-center rounded-xl border border-white/40 bg-white/25 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-white/40 disabled:opacity-50",
            expanded ? "justify-start gap-2 px-3" : "justify-center px-0",
          )}
          title={expanded ? undefined : "Cerrar sesión"}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30">
            <LogOutIcon />
          </span>
          <span className={cn(expanded ? "" : "sr-only")}>
            {loggingOut ? "Cerrando…" : "Cerrar sesión"}
          </span>
        </button>
      </div>
    </aside>
  );
}
