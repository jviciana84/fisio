"use client";

import { UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { AltaUsuarioForm } from "@/components/dashboard/AltaUsuarioForm";

export function StaffAltaUsuarioModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 rounded-xl border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => setOpen(true)}
        title="Nuevo usuario"
        aria-label="Abrir formulario de alta de usuario"
      >
        <UserPlus className="h-5 w-5" strokeWidth={2} />
      </Button>

      {mounted && open
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
              <div className="relative z-[10051] flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <h2 id="staff-alta-modal-title" className="text-base font-semibold text-slate-900">
                    Nuevo acceso
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <p className="mb-4 text-xs text-slate-500">
                    Completa los datos y pulsa crear usuario. La lista se actualizará al guardar.
                  </p>
                  <AltaUsuarioForm onSuccess={onSuccess} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
