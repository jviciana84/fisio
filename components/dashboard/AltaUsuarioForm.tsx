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
import { DASHBOARD_INPUT_CLASS_FORM } from "@/components/dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { parsePercentStringToHundredths } from "@/lib/format-es";
import { type StaffCompensationType, parseEuroStringToCents } from "@/lib/staff-compensation";
import type { HourlyTariffSlot } from "@/lib/staff-hourly-tariffs";

type Role = "admin" | "staff";

function parseEuroToCents(s: string): number | null {
  const raw = s.replace(",", ".").trim();
  if (raw === "") return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export type AltaUsuarioFormProps = {
  /** Tras crear usuario correctamente (tras reset y nuevo código). */
  onSuccess?: () => void;
  className?: string;
  /**
   * `wide`: dos columnas en pantallas grandes (p. ej. modal staff) para menos scroll.
   * `stack`: una columna (página configuración).
   */
  layout?: "stack" | "wide";
};

export function AltaUsuarioForm({ onSuccess, className, layout = "stack" }: AltaUsuarioFormProps) {
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
  const [tariff1Name, setTariff1Name] = useState("");
  const [tariff1Euro, setTariff1Euro] = useState("");
  /** Primera tarifa: €/h o % sobre venta. */
  const [tariff1Kind, setTariff1Kind] = useState<"hourly" | "percentage">("hourly");
  const [tariff1Percent, setTariff1Percent] = useState("");
  const [tariff2Name, setTariff2Name] = useState("");
  const [tariff2Euro, setTariff2Euro] = useState("");
  /** Segunda tarifa: €/h o % sobre venta. */
  const [tariff2Kind, setTariff2Kind] = useState<"hourly" | "percentage">("percentage");
  const [tariff2Percent, setTariff2Percent] = useState("");
  const [compensationType, setCompensationType] = useState<StaffCompensationType>("self_employed");
  const [annualSalaryEuro, setAnnualSalaryEuro] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
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
    if (compensationType === "salaried") {
      const sc = parseEuroStringToCents(annualSalaryEuro);
      if (sc === null || sc <= 0) return false;
    } else {
      if (!tariff1Name.trim()) return false;
      if (tariff1Kind === "hourly") {
        const c1 = parseEuroToCents(tariff1Euro);
        if (c1 === null || c1 <= 0) return false;
      } else {
        const h = parsePercentStringToHundredths(tariff1Percent);
        if (h === null || h <= 0) return false;
      }
      const t2HasSomething =
        tariff2Name.trim().length > 0 ||
        tariff2Euro.trim().length > 0 ||
        tariff2Percent.trim().length > 0;
      if (t2HasSomething) {
        if (!tariff2Name.trim()) return false;
        if (tariff2Kind === "hourly") {
          const c2 = parseEuroToCents(tariff2Euro);
          if (c2 === null || c2 <= 0) return false;
        } else {
          const h = parsePercentStringToHundredths(tariff2Percent);
          if (h === null || h <= 0) return false;
        }
      }
    }
    if (publicProfile && !publicBio.trim()) return false;
    return true;
  }, [
    fullName,
    email,
    pin,
    phoneDigits,
    userCode,
    codeLoading,
    tariff1Name,
    tariff1Euro,
    tariff1Kind,
    tariff1Percent,
    tariff2Name,
    tariff2Euro,
    tariff2Kind,
    tariff2Percent,
    publicProfile,
    publicBio,
    compensationType,
    annualSalaryEuro,
  ]);

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
    setAttemptedSubmit(true);
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

      fd.append("compensationType", compensationType);
      fd.append("monthlySalary", annualSalaryEuro.trim());
      fd.append("employmentStartDate", employmentStartDate);

      if (compensationType === "self_employed") {
        const slots: HourlyTariffSlot[] = [];
        if (tariff1Kind === "hourly") {
          const c1 = parseEuroToCents(tariff1Euro)!;
          slots.push({
            label: tariff1Name.trim(),
            kind: "hourly",
            cents_per_hour: c1,
            percent_hundredths: 0,
          });
        } else {
          const h = parsePercentStringToHundredths(tariff1Percent)!;
          slots.push({
            label: tariff1Name.trim(),
            kind: "percentage",
            cents_per_hour: 0,
            percent_hundredths: h,
          });
        }
        const t2Fill =
          tariff2Name.trim().length > 0 ||
          tariff2Euro.trim().length > 0 ||
          tariff2Percent.trim().length > 0;
        if (t2Fill && tariff2Name.trim()) {
          if (tariff2Kind === "hourly") {
            const c2 = parseEuroToCents(tariff2Euro);
            if (c2 !== null && c2 > 0) {
              slots.push({
                label: tariff2Name.trim(),
                kind: "hourly",
                cents_per_hour: c2,
                percent_hundredths: 0,
              });
            }
          } else {
            const h = parsePercentStringToHundredths(tariff2Percent);
            if (h !== null && h > 0) {
              slots.push({
                label: tariff2Name.trim(),
                kind: "percentage",
                cents_per_hour: 0,
                percent_hundredths: h,
              });
            }
          }
        }
        fd.append("hourlyTariffs", JSON.stringify(slots));
      } else {
        fd.append("hourlyTariffs", JSON.stringify([]));
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
      setAttemptedSubmit(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setPin("");
      setRole("staff");
      setRequireAuthenticator(true);
      setPublicProfile(true);
      setPublicSpecialty("");
      setPublicBio("");
      setTariff1Name("");
      setTariff1Euro("");
      setTariff1Kind("hourly");
      setTariff1Percent("");
      setTariff2Name("");
      setTariff2Euro("");
      setTariff2Kind("percentage");
      setTariff2Percent("");
      setCompensationType("self_employed");
      setAnnualSalaryEuro("");
      setEmploymentStartDate(new Date().toISOString().slice(0, 10));
      clearAvatar();
      await loadUserCode({ silent: true });
      onSuccess?.();
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = DASHBOARD_INPUT_CLASS_FORM;

  const checkboxBoxClass =
    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left";

  const wide = layout === "wide";

  const showErr = attemptedSubmit;
  const c1Parsed = parseEuroToCents(tariff1Euro);
  const p1Parsed = parsePercentStringToHundredths(tariff1Percent);
  const errTariff1Name = showErr && compensationType === "self_employed" && !tariff1Name.trim();
  const errTariff1Euro =
    showErr &&
    compensationType === "self_employed" &&
    tariff1Kind === "hourly" &&
    (c1Parsed === null || c1Parsed <= 0);
  const errTariff1Percent =
    showErr &&
    compensationType === "self_employed" &&
    tariff1Kind === "percentage" &&
    (p1Parsed === null || p1Parsed <= 0);
  const salaryParsed = parseEuroStringToCents(annualSalaryEuro);
  const errMonthlySalary =
    showErr && compensationType === "salaried" && (salaryParsed === null || salaryParsed <= 0);
  const errBio = showErr && publicProfile && !publicBio.trim();
  const errField =
    "border-rose-400 placeholder:text-rose-600 focus:border-rose-500 focus:ring-rose-100";

  const blockDatosAcceso = (
    <>
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
              className="mt-1.5 cursor-pointer text-left text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              Reintentar código
            </button>
          ) : null}
        </div>
      </div>
    </>
  );

  const blockRolPerfil = (
    <div
      className={cn(
        "border-t border-slate-100 pt-4",
        wide && "lg:border-t-0 lg:pt-0",
      )}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Rol · web
      </p>

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
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
          <label
            className={`${checkboxBoxClass} min-h-[2.625rem] items-center border-slate-200 bg-slate-50/90 sm:mt-0`}
          >
            <input
              type="checkbox"
              checked={publicProfile}
              onChange={(e) => {
                setPublicProfile(e.target.checked);
                if (!e.target.checked) clearAvatar();
              }}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-slate-800">Visible en la web</span>
          </label>
        </div>

        {showAuthCheckbox ? (
          <label
            className={`${checkboxBoxClass} mt-2 items-center border-blue-100 bg-blue-50/90 py-2`}
          >
            <input
              type="checkbox"
              checked={requireAuthenticator}
              onChange={(e) => setRequireAuthenticator(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700">Authenticator al entrar (admin)</span>
          </label>
        ) : null}

        {publicProfile ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 md:items-start">
            <div>
              <label
                htmlFor={fid("publicSpecialty")}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Especialidad
              </label>
              <input
                id={fid("publicSpecialty")}
                value={publicSpecialty}
                onChange={(e) => setPublicSpecialty(e.target.value)}
                className={inputClass}
                placeholder="Deportiva…"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor={fid("publicAvatar")}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Foto
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
              <p className="mt-0.5 text-[10px] text-slate-500">JPG/PNG/WebP/GIF · 2 MB</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor={fid("publicBio")} className="mb-1 block text-xs font-medium text-slate-700">
                Bio
              </label>
              <textarea
                id={fid("publicBio")}
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value)}
                rows={2}
                className={cn(
                  inputClass,
                  "resize-y min-h-[3.25rem] py-2",
                  errBio && errField,
                )}
                placeholder="Texto público"
                required={publicProfile}
              />
            </div>
          </div>
        ) : null}
      </div>
  );

  const blockTarifas = (
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-4">
        <span className="mb-2 block text-xs font-medium text-slate-700">Retribución</span>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              compensationType === "self_employed" ? "text-slate-900" : "text-slate-400",
            )}
          >
            Autónomo
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={compensationType === "salaried"}
            aria-label="Asalariado: activado. Autónomo: desactivado."
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
              compensationType === "salaried" ? "bg-blue-600" : "bg-slate-300",
            )}
            onClick={() =>
              setCompensationType((prev) => (prev === "salaried" ? "self_employed" : "salaried"))
            }
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                compensationType === "salaried" && "translate-x-5",
              )}
            />
          </button>
          <span
            className={cn(
              "text-xs font-medium",
              compensationType === "salaried" ? "text-slate-900" : "text-slate-400",
            )}
          >
            Asalariado
          </span>
        </div>
      </div>

      <div className="mb-3 border-b border-slate-100 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {compensationType === "salaried" ? "Salario bruto anual" : "Tarifas autónomo"}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-600">
          {compensationType === "salaried"
            ? "Bruto anual (referencia interna)"
            : "Tarifa 1 obligatoria (€/h o %). Tarifa 2 opcional (€/h o %)."}
        </p>
      </div>

      {compensationType === "salaried" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("monthlySalary")} className="mb-1 block text-xs font-medium text-slate-700">
              Importe (€ bruto)
            </label>
            <input
              id={fid("monthlySalary")}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={annualSalaryEuro}
              onChange={(e) => setAnnualSalaryEuro(e.target.value)}
              className={cn(inputClass, "text-right tabular-nums", errMonthlySalary && errField)}
              placeholder="0,00"
              aria-label="Salario bruto anual en euros"
            />
          </div>
          <div>
            <label htmlFor={fid("employmentStartDate")} className="mb-1 block text-xs font-medium text-slate-700">
              Fecha de alta
            </label>
            <input
              id={fid("employmentStartDate")}
              type="date"
              value={employmentStartDate}
              onChange={(e) => setEmploymentStartDate(e.target.value)}
              className={inputClass}
              aria-label="Fecha de alta del asalariado"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-slate-600">Tarifa 1</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                    tariff1Kind === "hourly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => setTariff1Kind("hourly")}
                >
                  €/h
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                    tariff1Kind === "percentage"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => setTariff1Kind("percentage")}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-center text-[10px] font-bold text-slate-400">1</span>
              <input
                id={fid("tariff-name-0")}
                value={tariff1Name}
                onChange={(e) => setTariff1Name(e.target.value)}
                className={cn(inputClass, "min-w-0 flex-1", errTariff1Name && errField)}
                placeholder="Nombre"
                autoComplete="off"
                aria-label="Tarifa 1 nombre"
              />
              {tariff1Kind === "hourly" ? (
                <input
                  id={fid("tariff-euro-0")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={tariff1Euro}
                  onChange={(e) => setTariff1Euro(e.target.value)}
                  className={cn(
                    inputClass,
                    "w-[5.25rem] shrink-0 text-right tabular-nums sm:w-[5.5rem]",
                    errTariff1Euro && errField,
                  )}
                  placeholder="€/h"
                  aria-label="Tarifa 1 euros por hora"
                />
              ) : (
                <input
                  id={fid("tariff-pct-0")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={tariff1Percent}
                  onChange={(e) => setTariff1Percent(e.target.value)}
                  className={cn(
                    inputClass,
                    "w-[5.25rem] shrink-0 text-right tabular-nums sm:w-[5.5rem]",
                    errTariff1Percent && errField,
                  )}
                  placeholder="%"
                  aria-label="Tarifa 1 porcentaje sobre venta"
                />
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-slate-600">Tarifa 2 (opcional)</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                    tariff2Kind === "hourly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => setTariff2Kind("hourly")}
                >
                  €/h
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                    tariff2Kind === "percentage"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => setTariff2Kind("percentage")}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-center text-[10px] font-bold text-slate-400">2</span>
              <input
                id={fid("tariff-name-1")}
                value={tariff2Name}
                onChange={(e) => setTariff2Name(e.target.value)}
                className={cn(inputClass, "min-w-0 flex-1")}
                placeholder="Nombre"
                autoComplete="off"
                aria-label="Tarifa 2 nombre"
              />
              {tariff2Kind === "hourly" ? (
                <input
                  id={fid("tariff-euro-1")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={tariff2Euro}
                  onChange={(e) => setTariff2Euro(e.target.value)}
                  className={cn(
                    inputClass,
                    "w-[5.25rem] shrink-0 text-right tabular-nums sm:w-[5.5rem]",
                  )}
                  placeholder="€/h"
                  aria-label="Tarifa 2 euros por hora"
                />
              ) : (
                <input
                  id={fid("tariff-pct-1")}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={tariff2Percent}
                  onChange={(e) => setTariff2Percent(e.target.value)}
                  className={cn(
                    inputClass,
                    "w-[5.25rem] shrink-0 text-right tabular-nums sm:w-[5.5rem]",
                  )}
                  placeholder="%"
                  aria-label="Tarifa 2 porcentaje sobre venta"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(wide ? "space-y-5" : "space-y-4", className)}
    >
      {wide ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-10 lg:items-start">
            <div className="min-w-0 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Datos de acceso
              </p>
              {blockDatosAcceso}
            </div>
            <div className="min-w-0">{blockRolPerfil}</div>
          </div>
          <div className="min-w-0 w-full">{blockTarifas}</div>
        </div>
      ) : (
        <>
          {blockDatosAcceso}
          {blockRolPerfil}
          {blockTarifas}
        </>
      )}

      <Button
        type="submit"
        variant="gradient"
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-500/25"
      >
        {loading ? "Guardando…" : "Crear usuario"}
      </Button>

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
