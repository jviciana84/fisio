"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type DashboardAddFabButtonProps = {
  icon: LucideIcon;
  /** Texto para `title`, `aria-label` y lectores de pantalla */
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Botón circular flotante de alta (misma línea visual: fondo blanco, sombra suave, icono lineal).
 */
export function DashboardAddFabButton({
  icon: Icon,
  label,
  onClick,
  className,
  disabled,
}: DashboardAddFabButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-800 shadow-[0_10px_30px_-6px_rgba(15,23,42,0.2),0_2px_8px_-2px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-[0_14px_36px_-6px_rgba(15,23,42,0.26),0_4px_10px_-2px_rgba(15,23,42,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <Icon className="h-7 w-7" strokeWidth={1.65} aria-hidden />
    </button>
  );
}
