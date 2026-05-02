"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Calendar,
  ChevronDown,
  ClipboardList,
  Coins,
  Home,
  Landmark,
  LogOut,
  Package,
  ScrollText,
  ReceiptEuro,
  QrCode,
  Settings,
  UserCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navIconClass = "h-[1.15rem] w-[1.15rem]";

/** Mismo isotipo que la web pública (`components/header.tsx`). */
const LOGO_FRB3_SRC = "/images/logo%20FRB3.svg";

/**
 * Duración + easing compartidos (clases literales para que Tailwind las incluya).
 * Cubic-bezier suave al final — menos sensación de “salto” que ease-out lineal.
 */
const SIDEBAR_TIMING =
  "duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

function NavLabel({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "block min-w-0 flex-1 overflow-hidden text-left whitespace-nowrap transition-[max-width,opacity]",
        SIDEBAR_TIMING,
        expanded ? "max-w-[11rem] opacity-100" : "max-w-0 opacity-0",
      )}
      aria-hidden={!expanded}
    >
      {children}
    </span>
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

  /** Siempre alineado a la izquierda: solo cambia el ancho del panel y la visibilidad del texto. */
  const itemBase = cn(
    "flex w-full min-w-0 items-center justify-start gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-900",
    "bg-transparent",
    SIDEBAR_TIMING,
    "transition-[background-color,color,box-shadow]",
  );

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 flex h-screen shrink-0 self-start flex-col overflow-hidden print:hidden",
        "border-r border-slate-300/90 bg-white/72 shadow-[0_14px_38px_rgba(15,23,42,0.2)] backdrop-blur-2xl",
        SIDEBAR_TIMING,
        "transition-[width] will-change-[width]",
        expanded ? "w-64" : "w-[4.25rem]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-300/90 bg-white/55 px-2 py-3">
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
            "min-w-0 overflow-hidden transition-[max-width,opacity]",
            SIDEBAR_TIMING,
            expanded ? "max-w-[11rem] opacity-100" : "max-w-0 opacity-0",
          )}
        >
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fisioterapia Roc Blanc
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">Panel</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
        <Link
          href="/dashboard"
          className={cn(
            itemBase,
            pathname === "/dashboard"
              ? "bg-white/70 text-slate-950 shadow-sm"
              : "hover:bg-white/60",
          )}
          title={expanded ? undefined : "Inicio"}
          aria-label={expanded ? undefined : "Inicio"}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
            <Home className={navIconClass} strokeWidth={2.25} aria-hidden />
          </span>
          <NavLabel expanded={expanded}>Inicio</NavLabel>
        </Link>

        {isAdmin ? (
          <>
            <Link
              href="/dashboard/ingresos"
              className={cn(
                itemBase,
                pathname.startsWith("/dashboard/ingresos")
                  ? "bg-white/70 text-slate-950 shadow-sm"
                  : "hover:bg-white/60",
              )}
              title={expanded ? undefined : "Ingresos"}
              aria-label={expanded ? undefined : "Ingresos"}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300/80 bg-emerald-100/80 text-emerald-900">
                <ReceiptEuro className={navIconClass} strokeWidth={2.25} aria-hidden />
              </span>
              <NavLabel expanded={expanded}>Ingresos</NavLabel>
            </Link>

            <Link
              href="/dashboard/gastos"
              className={cn(
                itemBase,
                pathname.startsWith("/dashboard/gastos")
                  ? "bg-white/70 text-slate-950 shadow-sm"
                  : "hover:bg-white/60",
              )}
              title={expanded ? undefined : "Gastos"}
              aria-label={expanded ? undefined : "Gastos"}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-300/80 bg-rose-100/80 text-rose-900">
                <ClipboardList className={navIconClass} strokeWidth={2.25} aria-hidden />
              </span>
              <NavLabel expanded={expanded}>Gastos</NavLabel>
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard#caja"
            className={cn(
              itemBase,
              pathname === "/dashboard"
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Caja"}
            aria-label={expanded ? undefined : "Caja"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300/80 bg-emerald-100/80 text-emerald-900">
              <Coins className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Caja</NavLabel>
          </Link>
        )}

        {isAdmin ? (
          <Link
            href="/dashboard/facturas"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/facturas")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Facturas"}
            aria-label={expanded ? undefined : "Facturas"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <ScrollText className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Facturas</NavLabel>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/fiscal"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/fiscal")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Impuestos"}
            aria-label={expanded ? undefined : "Impuestos"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <Landmark className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Impuestos</NavLabel>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/productos"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/productos")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Productos"}
            aria-label={expanded ? undefined : "Productos"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <Package className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Productos</NavLabel>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/bonos"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/bonos")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Bonos activos"}
            aria-label={expanded ? undefined : "Bonos activos"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/80 bg-cyan-100/80 text-cyan-900">
              <QrCode className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Bonos activos</NavLabel>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/clientes"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/clientes")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Clientes"}
            aria-label={expanded ? undefined : "Clientes"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <UserCircle className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Clientes</NavLabel>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link
            href="/dashboard/staff"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/staff")
                ? "bg-white/70 text-slate-950 shadow-sm"
                : "hover:bg-white/60",
            )}
            title={expanded ? undefined : "Staff"}
            aria-label={expanded ? undefined : "Staff"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <Users className={navIconClass} strokeWidth={2.25} aria-hidden />
            </span>
            <NavLabel expanded={expanded}>Staff</NavLabel>
          </Link>
        ) : null}

        {isAdmin && !expanded ? (
          <Link
            href="/dashboard/configuracion/usuarios"
            className={cn(
              itemBase,
              pathname.startsWith("/dashboard/configuracion/usuarios")
                ? "bg-white/70 shadow-sm"
                : "hover:bg-white/60",
            )}
            title="Configuración — Alta de usuarios"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
              <Settings className={navIconClass} strokeWidth={2.25} aria-hidden />
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
                "w-full text-left",
                pathname.startsWith("/dashboard/configuracion")
                  ? "bg-white/70 shadow-sm"
                  : "hover:bg-white/60",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white text-blue-900">
                <Settings className={navIconClass} strokeWidth={2.25} aria-hidden />
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
                    <UserPlus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
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
                    <Package className="h-4 w-4" strokeWidth={2.25} aria-hidden />
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
                    <ClipboardList className="h-4 w-4" strokeWidth={2.25} aria-hidden />
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
                    <Calendar className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span>Calendario Google</span>
                </Link>
                <Link
                  href="/dashboard/configuracion/alarma"
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm font-medium transition",
                    pathname.startsWith("/dashboard/configuracion/alarma")
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm">
                    <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span>Alarma leads</span>
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-slate-300/90 bg-white/50 p-1.5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "border border-slate-300/80 bg-white/70 hover:bg-white/90 disabled:opacity-50",
            itemBase,
          )}
          title={expanded ? undefined : "Cerrar sesión"}
          aria-label={expanded ? undefined : loggingOut ? "Cerrando sesión" : "Cerrar sesión"}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 bg-white">
            <LogOut className={navIconClass} strokeWidth={2.25} aria-hidden />
          </span>
          <NavLabel expanded={expanded}>{loggingOut ? "Cerrando…" : "Cerrar sesión"}</NavLabel>
        </button>
      </div>
    </aside>
  );
}
