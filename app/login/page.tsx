"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionWatermark } from "@/components/section-watermark";

export default function LoginPage() {
  const router = useRouter();
  const pinInputRef = useRef<HTMLInputElement>(null);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmitPin = useMemo(() => /^\d{4}$/.test(pin), [pin]);
  const canSubmitTotp = useMemo(() => /^\d{6}$/.test(totpCode), [totpCode]);

  useEffect(() => {
    if (requiresTotp) {
      const id = window.setTimeout(() => {
        totpInputRef.current?.focus();
        totpInputRef.current?.select();
      }, 320);
      return () => window.clearTimeout(id);
    }
    const id = window.requestAnimationFrame(() => {
      pinInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [requiresTotp]);

  async function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitPin) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        requiresTwoFactor?: boolean;
        requiresTotpOnboarding?: boolean;
        redirectTo?: string;
      };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "No se pudo iniciar sesión.");
        return;
      }

      if (data.requiresTotpOnboarding) {
        router.push(data.redirectTo ?? "/onboarding/totp");
        return;
      }

      if (data.requiresTwoFactor) {
        setRequiresTotp(true);
        return;
      }

      router.push(data.redirectTo ?? "/dashboard");
    } catch {
      setErrorMessage("Error de red al validar PIN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitTotp) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
      };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "No se pudo verificar TOTP.");
        return;
      }

      router.push(data.redirectTo ?? "/dashboard");
    } catch {
      setErrorMessage("Error de red al validar TOTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden min-h-0 overflow-hidden lg:flex lg:min-h-screen lg:flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-500 to-sky-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(191,219,254,0.45),transparent_40%)]" />
          <SectionWatermark align="left" tone="white" scaleFactor={0.6} />
          <div className="relative z-10 flex w-full flex-1 flex-col justify-end p-16 text-white">
            <div className="max-w-md rounded-3xl border border-white/30 bg-white/15 p-8 shadow-2xl backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">
                Portal para la gestión
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">
                FISIOTERAPIA
                <br />
                ROC BLANC
              </h1>
              <p className="mt-5 text-sm text-blue-50/90">
                Accede a una gestión clínica conectada, precisa y pensada para
                optimizar cada sesión terapéutica.
              </p>
            </div>
          </div>
        </aside>

        <aside className="flex items-center justify-center bg-white px-6 py-10 lg:px-16">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-700">
                Acceso personal
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Ingresa tu PIN. Si tu perfil lo requiere, te pediremos un código
                TOTP de 6 dígitos.
              </p>
            </div>

            <div className="overflow-hidden">
              <div
                className={`grid transition-transform duration-300 ${
                  requiresTotp ? "-translate-x-full" : "translate-x-0"
                }`}
                style={{ gridTemplateColumns: "100% 100%" }}
              >
                <form className="space-y-5 pr-6" onSubmit={handlePinSubmit}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      PIN de acceso
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Introduce 4 dígitos para continuar
                    </p>
                  </div>
                  <input
                    ref={pinInputRef}
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl tracking-[0.45em] text-slate-900 outline-none transition duration-300 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmitPin || isSubmitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    {isSubmitting ? "Validando PIN..." : "Continuar"}
                  </button>
                </form>

                <form
                  className="flex min-h-[290px] flex-col items-center justify-center space-y-5 pl-6"
                  onSubmit={handleTotpSubmit}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Verificación en dos pasos
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Introduce el código de tu app autenticadora
                    </p>
                  </div>
                  <input
                    ref={totpInputRef}
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(event) =>
                      setTotpCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="w-full max-w-[240px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl tracking-[0.25em] text-slate-900 outline-none transition duration-300 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmitTotp || isSubmitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    {isSubmitting ? "Verificando..." : "Entrar al sistema"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresTotp(false);
                      setTotpCode("");
                    }}
                    className="text-sm font-medium text-slate-500 transition-colors duration-300 hover:text-slate-700"
                  >
                    Volver al PIN
                  </button>
                </form>
              </div>
            </div>
            {errorMessage ? (
              <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
