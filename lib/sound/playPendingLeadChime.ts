import {
  type PendingLeadAlarmSettings,
  loadPendingLeadAlarmSettings,
} from "@/lib/sound/pendingLeadAlarmSettings";

const BEEP1_S = 0.2;
const GAP_S = 0.16;
const BEEP2_S = 0.2;

function pairDurationSeconds(): number {
  return BEEP1_S + GAP_S + BEEP2_S;
}

/**
 * Programa un pitido sinusoidal con envolvente suave.
 * `peakGain` ~ 0.02–0.18 según volumen.
 */
function scheduleBeep(
  ctx: AudioContext,
  startAt: number,
  freq: number,
  peakGain: number,
  durationSec: number,
): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = startAt;
  const dur = durationSec;
  if (dur <= 0.03) return;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0002), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur - 0.02);
  o.start(t0);
  o.stop(t0 + dur);
}

/**
 * Alarma de leads pendientes (Web Audio API).
 * Respeta ajustes en `localStorage` salvo que se pasen `overrides` (p. ej. vista previa desde el formulario).
 */
export async function playPendingLeadChime(overrides?: Partial<PendingLeadAlarmSettings>): Promise<void> {
  if (typeof window === "undefined") return;
  const s = { ...loadPendingLeadAlarmSettings(), ...overrides };
  if (s.muted) return;

  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const vol = Math.max(0.03, (clampPct(s.volumePercent) / 100) * 0.14);
    const reps = clampInt(s.repetitions, 1, 6);
    const pause = Math.max(0, Math.min(5, s.pauseBetweenSeconds));
    const f1 = s.tone1Hz;
    const f2 = s.tone2Hz;
    const pair = pairDurationSeconds();
    const t0 = ctx.currentTime;

    for (let r = 0; r < reps; r++) {
      const base = t0 + r * (pair + pause);
      scheduleBeep(ctx, base, f1, vol, BEEP1_S);
      scheduleBeep(ctx, base + BEEP1_S + GAP_S, f2, vol, BEEP2_S);
    }

    const totalSec = reps * pair + Math.max(0, reps - 1) * pause + 0.35;
    window.setTimeout(() => {
      void ctx.close();
    }, Math.ceil(totalSec * 1000) + 120);
  } catch {
    /* autoplay / sin WebAudio */
  }
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 45;
  return Math.min(100, Math.max(0, n));
}

function clampInt(n: number, lo: number, hi: number): number {
  const x = Math.round(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}
