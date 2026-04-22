/**
 * Iconos según código WMO (Open-Meteo): colores vivos y rellenos suaves.
 */
export function WeatherWmoIcon({
  code,
  className = "h-10 w-10",
}: {
  code: number;
  className?: string;
}) {
  const stroke = "currentColor";
  const common = {
    className,
    fill: "none" as const,
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (code === 0) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} drop-shadow-sm`}>
        <defs>
          <radialGradient id="wmo-sun" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="10" fill="url(#wmo-sun)" stroke="#d97706" strokeWidth={1.5} />
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4M11 11l3 3M34 34l3 3M34 11l-3 3M11 34l3-3" stroke="#f59e0b" />
      </svg>
    );
  }
  /* 1 = mayormente despejado, 2 = parcialmente nublado, 3 = cubierto */
  if (code === 1) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} drop-shadow-sm`}>
        <defs>
          <radialGradient id="wmo-sun-p" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <circle cx="22" cy="22" r="9" fill="url(#wmo-sun-p)" stroke="#d97706" strokeWidth={1.5} />
        <path d="M22 8v3M22 36v3M8 22h3M36 22h3" stroke="#f59e0b" />
        <path
          d="M28 26c0-4 3-7 7-7"
          className="text-slate-400"
          stroke="currentColor"
          strokeWidth={1.75}
          fill="none"
        />
      </svg>
    );
  }
  if (code === 2) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-500 drop-shadow-sm`}>
        <circle cx="18" cy="18" r="7" className="text-amber-400" fill="#fde68a" stroke="#d97706" />
        <path
          d="M14 30c0-5 4-9 9-9s9 4 9 9"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        <path d="M10 32h28" className="text-slate-300" stroke="currentColor" strokeWidth={1.2} />
      </svg>
    );
  }
  if (code === 3) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-500 drop-shadow-sm`}>
        <path
          d="M14 28c0-6 5-11 11-11s11 5 11 11"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        <path d="M10 30h28" className="text-slate-300" stroke="currentColor" strokeWidth={1.2} />
      </svg>
    );
  }
  if ([45, 48].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-400 drop-shadow-sm`}>
        <path
          d="M12 32h24M16 28l-2 8M24 28l0 8M32 28l2 8"
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.75}
        />
      </svg>
    );
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-blue-500 drop-shadow-sm`}>
        <path
          d="M14 22c0-5 4-9 9-9s9 4 9 9v2H14v-2z"
          fill="#bfdbfe"
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
        <path d="M18 28v6M24 28v8M30 28v6" stroke="#2563eb" strokeWidth={1.75} />
      </svg>
    );
  }
  if ([71, 73, 75].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-cyan-400 drop-shadow-sm`}>
        <path d="M16 20l4 4 4-4 4 4" fill="#a5f3fc" stroke="#06b6d4" strokeWidth={1.5} />
        <circle cx="20" cy="30" r="1.5" fill="#0e7490" stroke="none" />
        <circle cx="28" cy="32" r="1.5" fill="#0e7490" stroke="none" />
      </svg>
    );
  }
  if ([95, 96, 99].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-violet-500 drop-shadow-sm`}>
        <path
          d="M12 24h8M28 24h8M24 12v8M20 32l4 8 4-8"
          stroke="#7c3aed"
          fill="none"
          strokeWidth={1.75}
        />
        <path d="M10 20h28" stroke="#a78bfa" strokeWidth={1.2} opacity={0.6} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-500`}>
      <circle cx="24" cy="24" r="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.2} />
    </svg>
  );
}
