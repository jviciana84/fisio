"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "admin" | "staff" | "caja";

export default function AltaUsuariosPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [requireAuthenticator, setRequireAuthenticator] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const showAuthCheckbox = role === "admin";

  const canSubmit = useMemo(() => {
    if (!fullName.trim() || !email.trim() || !/^\d{4}$/.test(pin)) return false;
    return true;
  }, [fullName, email, pin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          pin,
          role,
          requireAuthenticatorOnFirstLogin:
            role === "admin" ? requireAuthenticator : false,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        requiresFirstLoginTotp?: boolean;
      };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "Error al crear usuario" });
        return;
      }
      let text = "Usuario creado correctamente.";
      if (data.requiresFirstLoginTotp) {
        text +=
          " En el primer acceso con su PIN deberá configurar Google Authenticator.";
      }
      setMessage({ type: "ok", text });
      setFullName("");
      setEmail("");
      setPin("");
      setRole("staff");
      setRequireAuthenticator(true);
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Configuración
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Alta de usuarios
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea accesos con PIN. Si el rol es administrador y activas el
          autenticador en el primer acceso, al iniciar sesión verá el QR de
          Google Authenticator antes de entrar al panel.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label
              htmlFor="pin"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              PIN (4 dígitos)
            </label>
            <input
              id="pin"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-[140px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-lg tracking-widest text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Rol
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="staff">Personal / staff</option>
              <option value="caja">Caja</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {showAuthCheckbox ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
              <input
                type="checkbox"
                checked={requireAuthenticator}
                onChange={(e) => setRequireAuthenticator(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">
                <strong>Google Authenticator en el primer acceso.</strong> El
                usuario verá el código QR tras introducir su PIN por primera
                vez y deberá confirmar con un código de 6 dígitos.
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Crear usuario"}
          </button>

          {message ? (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "ok"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
