"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "admin" | "staff";

export default function AltaUsuariosPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [userCode, setUserCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [role, setRole] = useState<Role>("staff");
  const [requireAuthenticator, setRequireAuthenticator] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const showAuthCheckbox = role === "admin";

  const loadUserCode = useCallback(async (opts?: { silent?: boolean }) => {
    setCodeLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      const data = (await res.json()) as { userCode?: string; message?: string };
      if (!res.ok) {
        setUserCode(null);
        if (!opts?.silent) {
          setMessage({
            type: "err",
            text: data.message ?? "No se pudo obtener el código de usuario.",
          });
        }
        return;
      }
      if (data.userCode) setUserCode(data.userCode);
    } catch {
      setUserCode(null);
      if (!opts?.silent) {
        setMessage({ type: "err", text: "Error de red al obtener el código de usuario." });
      }
    } finally {
      setCodeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUserCode();
  }, [loadUserCode]);

  const phoneDigits = phone.replace(/\D/g, "");

  const canSubmit = useMemo(() => {
    if (!fullName.trim() || !email.trim() || !/^\d{4}$/.test(pin)) return false;
    if (phoneDigits.length < 9 || phoneDigits.length > 15) return false;
    if (!userCode || codeLoading) return false;
    return true;
  }, [fullName, email, pin, phoneDigits, userCode, codeLoading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !userCode) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          userCode,
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
        userCode?: string;
      };
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          await loadUserCode({ silent: true });
        }
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
      setPhone("");
      setPin("");
      setRole("staff");
      setRequireAuthenticator(true);
      await loadUserCode({ silent: true });
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-5xl overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-0">
          <div className="min-w-0 flex-1 lg:max-w-md lg:pr-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Configuración
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Alta de usuarios
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Crea accesos con PIN. Si el rol es administrador y activas el
              autenticador en el primer acceso, al iniciar sesión verá el QR de
              Google Authenticator antes de entrar al panel.
            </p>
          </div>

          <div
            className="hidden shrink-0 lg:block lg:w-px lg:self-stretch lg:bg-gradient-to-b lg:from-transparent lg:via-slate-300 lg:to-transparent"
            aria-hidden
          />
          <hr className="border-slate-200 lg:hidden" />

          <div className="min-w-0 flex-1 lg:min-w-[min(100%,28rem)] lg:pl-10 xl:min-w-[32rem]">
            <div
              className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] md:p-8"
              role="region"
              aria-labelledby="alta-form-title"
            >
              <h2
                id="alta-form-title"
                className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
              >
                Nuevo acceso
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Completa los datos y pulsa crear usuario.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
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
                    className={inputClass}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
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
                      className={inputClass}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      required
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <div className="flex min-w-0 flex-col">
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
                      className={`${inputClass} max-w-full text-center font-mono text-lg tracking-[0.35em] sm:max-w-[11rem]`}
                      required
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Código usuario
                    </span>
                    <div
                      className="flex min-h-[2.625rem] w-full max-w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xl font-semibold tabular-nums tracking-widest text-slate-900 shadow-sm sm:max-w-none"
                      title="Asignado al cargar el formulario"
                    >
                      {codeLoading ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : userCode ? (
                        userCode
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    {!codeLoading && !userCode ? (
                      <button
                        type="button"
                        onClick={() => void loadUserCode()}
                        className="mt-2 text-left text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
                      >
                        Reintentar código
                      </button>
                    ) : null}
                  </div>
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
                    className={inputClass}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {showAuthCheckbox ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/90 p-4">
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
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Crear usuario"}
                </button>

                {message ? (
                  <p
                    className={`rounded-xl px-4 py-3 text-sm ${
                      message.type === "ok"
                        ? "border border-blue-200 bg-blue-50 text-blue-800"
                        : "border border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {message.text}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
