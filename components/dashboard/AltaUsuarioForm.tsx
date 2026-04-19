"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type Role = "admin" | "staff";

export type AltaUsuarioFormProps = {
  /** Tras crear usuario correctamente (tras reset y nuevo código). */
  onSuccess?: () => void;
  className?: string;
};

export function AltaUsuarioForm({ onSuccess, className }: AltaUsuarioFormProps) {
  const reactId = useId().replace(/:/g, "");
  const fid = (name: string) => `alta-${reactId}-${name}`;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [userCode, setUserCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [role, setRole] = useState<Role>("staff");
  const [requireAuthenticator, setRequireAuthenticator] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [publicSpecialty, setPublicSpecialty] = useState("");
  const [publicBio, setPublicBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const showAuthCheckbox = role === "admin";

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

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

  function clearAvatar() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    setAvatarFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    if (!f) {
      setAvatarFile(null);
      return;
    }
    setAvatarFile(f);
    setAvatarPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !userCode) return;
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("fullName", fullName.trim());
      fd.append("email", email.trim().toLowerCase());
      fd.append("phone", phone.trim());
      fd.append("userCode", userCode);
      fd.append("pin", pin);
      fd.append("role", role);
      fd.append(
        "requireAuthenticatorOnFirstLogin",
        role === "admin" && requireAuthenticator ? "1" : "0",
      );
      fd.append("publicProfile", publicProfile ? "1" : "0");
      fd.append("publicSpecialty", publicSpecialty);
      fd.append("publicBio", publicBio);
      if (avatarFile && publicProfile) {
        fd.append("avatar", avatarFile);
      }

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        requiresFirstLoginTotp?: boolean;
        userCode?: string;
        avatarWarning?: string;
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
      if (data.avatarWarning) {
        text += ` ${data.avatarWarning}`;
      }
      setMessage({ type: "ok", text });
      setFullName("");
      setEmail("");
      setPhone("");
      setPin("");
      setRole("staff");
      setRequireAuthenticator(true);
      setPublicProfile(true);
      setPublicSpecialty("");
      setPublicBio("");
      clearAvatar();
      await loadUserCode({ silent: true });
      onSuccess?.();
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

  const checkboxBoxClass =
    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left";

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      <div>
        <label htmlFor={fid("fullName")} className="mb-1 block text-xs font-medium text-slate-700">
          Nombre completo
        </label>
        <input
          id={fid("fullName")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          required
          autoComplete="name"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
        <div>
          <label htmlFor={fid("email")} className="mb-1 block text-xs font-medium text-slate-700">
            Email
          </label>
          <input
            id={fid("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor={fid("phone")} className="mb-1 block text-xs font-medium text-slate-700">
            Teléfono
          </label>
          <input
            id={fid("phone")}
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
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
        <div className="flex min-w-0 flex-col">
          <label htmlFor={fid("pin")} className="mb-1 block text-xs font-medium text-slate-700">
            PIN (4 dígitos)
          </label>
          <input
            id={fid("pin")}
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} max-w-full text-center font-mono text-base tracking-[0.35em] sm:max-w-[11rem]`}
            required
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="mb-1 block text-xs font-medium text-slate-700">Código usuario</span>
          <div
            className={`${inputClass} flex items-center font-mono text-sm font-semibold tabular-nums tracking-widest`}
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
              className="mt-1.5 text-left text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              Reintentar código
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Rol y perfil web
        </p>

        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div>
            <label htmlFor={fid("role")} className="mb-1 block text-xs font-medium text-slate-700">
              Rol
            </label>
            <select
              id={fid("role")}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <span
              className="mb-1 block text-xs font-medium text-transparent select-none"
              aria-hidden
            >
              —
            </span>
            <label className={`${checkboxBoxClass} border-slate-200 bg-slate-50/90`}>
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => {
                  setPublicProfile(e.target.checked);
                  if (!e.target.checked) clearAvatar();
                }}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-800">Perfil público en la web</span>
            </label>
          </div>
        </div>

        {showAuthCheckbox ? (
          <label
            className={`${checkboxBoxClass} mt-3 items-start border-blue-100 bg-blue-50/90 p-3`}
          >
            <input
              type="checkbox"
              checked={requireAuthenticator}
              onChange={(e) => setRequireAuthenticator(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs leading-snug text-slate-700">
              <strong className="block">Authenticator en 1.er acceso</strong>
              QR tras el primer PIN (admin).
            </span>
          </label>
        ) : null}

        {publicProfile ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 md:items-start">
            <div>
              <label
                htmlFor={fid("publicSpecialty")}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Especialidad (web){" "}
                <span className="font-normal text-slate-500">opcional</span>
              </label>
              <input
                id={fid("publicSpecialty")}
                value={publicSpecialty}
                onChange={(e) => setPublicSpecialty(e.target.value)}
                className={inputClass}
                placeholder="Ej. Fisioterapia deportiva"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor={fid("publicAvatar")}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Foto en la web <span className="font-normal text-slate-500">opcional</span>
              </label>
              <div className="flex items-start gap-2">
                <input
                  ref={avatarInputRef}
                  id={fid("publicAvatar")}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onAvatarChange}
                  className="block w-full min-w-0 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                />
                {avatarPreviewUrl ? (
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreviewUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] text-white shadow"
                      aria-label="Quitar imagen"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">JPG, PNG, WebP o GIF · máx. 2 MB</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor={fid("publicBio")} className="mb-1 block text-xs font-medium text-slate-700">
                Biografía breve <span className="font-normal text-slate-500">opcional</span>
              </label>
              <textarea
                id={fid("publicBio")}
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value)}
                rows={2}
                className={`${inputClass} resize-y min-h-[4rem] py-2`}
                placeholder="Una o dos frases sobre su enfoque."
              />
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Crear usuario"}
      </button>

      {message ? (
        <p
          className={`rounded-xl px-4 py-2.5 text-sm ${
            message.type === "ok"
              ? "border border-blue-200 bg-blue-50 text-blue-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
