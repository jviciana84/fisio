"use client";

import { UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DashboardAddFabButton } from "@/components/dashboard/DashboardAddFabButton";
import { AltaUsuarioForm } from "@/components/dashboard/AltaUsuarioForm";
import { Button } from "@/components/ui/button";

const clientSub = () => () => {};

export function StaffAltaUsuarioModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(clientSub, () => true, () => false);

  const onSuccess = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <DashboardAddFabButton
        icon={UserPlus}
        label="Nuevo usuario"
        onClick={() => setOpen(true)}
        className="shrink-0"
      />

      {isClient && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-alta-modal-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              />
              <div className="relative z-[10051] flex max-h-[min(96vh,980px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <h2 id="staff-alta-modal-title" className="text-base font-semibold text-slate-900">
                    Nuevo acceso
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                  <p className="mb-4 text-xs text-slate-500">
                    Completa y guarda; la lista se actualiza sola.
                  </p>
                  <AltaUsuarioForm layout="wide" onSuccess={onSuccess} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
