"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingTotpForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/totp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Error al verificar");
        return;
      }
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-sm space-y-4">
      <div>
        <label
          htmlFor="totp-confirm"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Introduce el código de 6 dígitos que muestra Google Authenticator
        </label>
        <input
          id="totp-confirm"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.2em] text-slate-900 outline-none transition focus:border-blue-400 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
        />
      </div>
      <button
        type="submit"
        disabled={!/^\d{6}$/.test(code) || loading}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
      >
        {loading ? "Comprobando…" : "Confirmar y entrar al panel"}
      </button>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
