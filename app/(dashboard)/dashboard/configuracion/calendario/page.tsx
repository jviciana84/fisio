"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DASHBOARD_INPUT_CLASS_FORM } from "@/components/dashboard/dashboard-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Status = {
  ok?: boolean;
  envConfigured?: boolean;
  connected?: boolean;
  email?: string | null;
  slotMinutes?: number;
  dayStart?: string;
  dayEnd?: string;
  timezone?: string;
  calendarId?: string;
};

export default function CalendarioGooglePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [slotMinutes, setSlotMinutes] = useState("45");
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [calendarId, setCalendarId] = useState("primary");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/google-calendar/status");
      const data = (await res.json()) as Status;
      setStatus(data);
      if (data.slotMinutes != null) setSlotMinutes(String(data.slotMinutes));
      if (data.dayStart) setDayStart(data.dayStart);
      if (data.dayEnd) setDayEnd(data.dayEnd);
      if (data.timezone) setTimezone(data.timezone);
      if (data.calendarId) setCalendarId(data.calendarId);
    } catch {
      setMessage({ type: "err", text: "No se pudo cargar el estado" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("connected") === "1") {
      setMessage({ type: "ok", text: "Calendario conectado correctamente." });
      window.history.replaceState({}, "", "/dashboard/configuracion/calendario");
    }
    const err = p.get("error");
    if (err) {
      const labels: Record<string, string> = {
        no_refresh_token:
          "Google no devolvió permiso offline. Prueba de nuevo o revoca el acceso de la app en tu cuenta Google.",
        access_denied: "Conexión cancelada.",
        token_exchange:
          "Falló el intercambio del código OAuth (redirect_uri distinta a la de Google Cloud, o cliente/secret incorrectos en Vercel). Revisa logs del deployment.",
        db_save:
          "No se pudo guardar en Supabase: ejecuta la migración 012 (tabla google_calendar_integration) y comprueba SUPABASE_SERVICE_ROLE_KEY en Vercel.",
        google_env: "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en variables de entorno (Vercel).",
        token_secret:
          "Falta AUTH_CHALLENGE_SECRET o GOOGLE_OAUTH_TOKEN_SECRET para cifrar el token.",
        auth_config: "Falta AUTH_CHALLENGE_SECRET en el servidor.",
        bad_state: "Sesión de enlace caducada o inválida. Vuelve a pulsar «Conectar con Google».",
      };
      setMessage({
        type: "err",
        text: labels[err] ?? `Error: ${err}`,
      });
      window.history.replaceState({}, "", "/dashboard/configuracion/calendario");
    }
  }, []);

  const canSave = useMemo(() => status?.connected === true, [status?.connected]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/google-calendar/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotMinutes: Number(slotMinutes),
          dayStart,
          dayEnd,
          timezone,
          calendarId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo guardar" });
        return;
      }
      setMessage({ type: "ok", text: "Horario de citas guardado." });
      await load();
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    } finally {
      setSaving(false);
    }
  }

  async function onDisconnect() {
    if (!confirm("¿Desconectar Google Calendar? Las reservas públicas dejarán de funcionar.")) {
      return;
    }
    setMessage(null);
    try {
      const res = await fetch("/api/admin/google-calendar/disconnect", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: "No se pudo desconectar" });
        return;
      }
      setMessage({ type: "ok", text: "Desconectado." });
      await load();
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    }
  }

  const inputClass = DASHBOARD_INPUT_CLASS_FORM;

  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-3xl overflow-hidden p-6 md:p-8 lg:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Calendario Google</h1>
        <p className="mt-2 text-sm text-slate-600">
          Conecta la cuenta de Google del centro para ofrecer citas en{" "}
          <a className="text-blue-700 underline" href="/reservar">
            /reservar
          </a>
          . El token se guarda cifrado en el servidor.
        </p>

        {loading ? (
          <p className="mt-6 text-slate-600">Cargando…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {status?.envConfigured === false ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Configura en el servidor{" "}
                <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_ID</code> y{" "}
                <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_SECRET</code> (y la URL de
                callback en Google Cloud).
              </div>
            ) : null}

            {message ? (
              <div
                className={
                  message.type === "ok"
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                    : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                }
              >
                {message.text}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {status?.connected ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
                  Conectado{status.email ? `: ${status.email}` : ""}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  No conectado
                </span>
              )}
              {status?.envConfigured ? (
                <a
                  href="/api/admin/google-calendar/connect"
                  className={cn(
                    buttonVariants({ variant: "gradient" }),
                    "inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm",
                  )}
                >
                  {status?.connected ? "Volver a conectar" : "Conectar con Google"}
                </a>
              ) : null}
              {status?.connected ? (
                <Button type="button" variant="outline" className="rounded-xl px-4 py-2.5 text-sm" onClick={() => void onDisconnect()}>
                  Desconectar
                </Button>
              ) : null}
            </div>

            <form onSubmit={onSave} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Franja de reservas</h2>
              <p className="text-sm text-slate-600">
                Solo se ofrecen huecos dentro de este horario (lunes a domingo). Los eventos ya
                existentes en Google bloquean automáticamente esos tramos.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Duración cita (min)
                  <input
                    className={`${inputClass} mt-1`}
                    type="number"
                    min={15}
                    max={180}
                    value={slotMinutes}
                    onChange={(e) => setSlotMinutes(e.target.value)}
                    disabled={!canSave}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Zona horaria
                  <input
                    className={`${inputClass} mt-1`}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={!canSave}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Hora inicio (HH:MM)
                  <input
                    className={`${inputClass} mt-1`}
                    value={dayStart}
                    onChange={(e) => setDayStart(e.target.value)}
                    disabled={!canSave}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Hora fin (HH:MM)
                  <input
                    className={`${inputClass} mt-1`}
                    value={dayEnd}
                    onChange={(e) => setDayEnd(e.target.value)}
                    disabled={!canSave}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  ID calendario (normalmente{" "}
                  <code className="text-xs">primary</code>)
                  <input
                    className={`${inputClass} mt-1 font-mono text-sm`}
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    disabled={!canSave}
                  />
                </label>
              </div>

              <Button
                type="submit"
                variant="gradient"
                disabled={!canSave || saving}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar horario"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
