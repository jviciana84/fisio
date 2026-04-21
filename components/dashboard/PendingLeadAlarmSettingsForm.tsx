"use client";

import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_INPUT_CLASS } from "@/components/dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PENDING_LEAD_ALARM,
  type PendingLeadAlarmSettings,
  loadPendingLeadAlarmSettings,
  savePendingLeadAlarmSettings,
} from "@/lib/sound/pendingLeadAlarmSettings";
import { playPendingLeadChime } from "@/lib/sound/playPendingLeadChime";

export function PendingLeadAlarmSettingsForm() {
  const [s, setS] = useState<PendingLeadAlarmSettings>(() => ({ ...DEFAULT_PENDING_LEAD_ALARM }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(loadPendingLeadAlarmSettings());
  }, []);

  const update = useCallback(<K extends keyof PendingLeadAlarmSettings>(key: K, value: PendingLeadAlarmSettings[K]) => {
    setSaved(false);
    setS((prev) => ({ ...prev, [key]: value }));
  }, []);

  const int = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const float = (v: string, fallback: number) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleSave = () => {
    savePendingLeadAlarmSettings(s);
    setSaved(true);
  };

  const handleReset = () => {
    setS({ ...DEFAULT_PENDING_LEAD_ALARM });
    savePendingLeadAlarmSettings({ ...DEFAULT_PENDING_LEAD_ALARM });
    setSaved(true);
  };

  const handleTest = () => {
    void playPendingLeadChime(s);
  };

  const input = DASHBOARD_INPUT_CLASS;

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          checked={s.muted}
          onChange={(e) => update("muted", e.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">Silenciar alarma</span>
          <span className="mt-0.5 block text-xs text-slate-600">
            No se reproducirá sonido al aparecer el aviso global de leads pendientes (sigue viéndose el modal).
          </span>
        </span>
      </label>

      <div className={s.muted ? "pointer-events-none opacity-45" : ""}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Repeticiones del par de pitidos (1–6)</label>
            <input
              type="number"
              min={1}
              max={6}
              className={input}
              value={s.repetitions}
              onChange={(e) => update("repetitions", int(e.target.value, s.repetitions))}
            />
            <p className="mt-1 text-[11px] text-slate-500">Cada repetición son dos tonos seguidos.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Pausa entre repeticiones (0–5 s)</label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.05}
              className={input}
              value={s.pauseBetweenSeconds}
              onChange={(e) => update("pauseBetweenSeconds", float(e.target.value, s.pauseBetweenSeconds))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Volumen: {s.volumePercent}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              className="w-full accent-blue-600"
              value={s.volumePercent}
              onChange={(e) => update("volumePercent", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tono 1 (Hz)</label>
            <input
              type="number"
              min={300}
              max={1400}
              step={10}
              className={input}
              value={s.tone1Hz}
              onChange={(e) => update("tone1Hz", int(e.target.value, s.tone1Hz))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tono 2 (Hz)</label>
            <input
              type="number"
              min={300}
              max={1400}
              step={10}
              className={input}
              value={s.tone2Hz}
              onChange={(e) => update("tone2Hz", int(e.target.value, s.tone2Hz))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="gradient" onClick={handleSave}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={handleTest} disabled={s.muted}>
          Probar sonido
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Valores por defecto
        </Button>
      </div>

      {saved ? <p className="text-sm font-medium text-emerald-700">Ajustes guardados en este navegador.</p> : null}
      <p className="text-xs leading-relaxed text-slate-500">
        Los ajustes se guardan solo en el navegador (localStorage). Otros equipos o perfiles no los comparten. El audio
        puede quedar bloqueado hasta que pulses una vez en la página (política del navegador).
      </p>
    </div>
  );
}
