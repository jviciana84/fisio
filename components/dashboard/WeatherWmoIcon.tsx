/**
 * Iconos minimalistas según código WMO (Open-Meteo). Estilo línea, acorde al panel.
 */
export function WeatherWmoIcon({
  code,
  className = "h-10 w-10",
}: {
  code: number;
  className?: string;
}) {
  const stroke = "currentColor";
  const common = { className, fill: "none" as const, stroke, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (code === 0) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-amber-400`}>
        <circle cx="24" cy="24" r="10" />
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4M11 11l3 3M34 34l3 3M34 11l-3 3M11 34l3-3" />
      </svg>
    );
  }
  /* 1 = mayormente despejado, 2 = parcialmente nublado, 3 = cubierto */
  if (code === 1) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-amber-400`}>
        <circle cx="22" cy="22" r="9" />
        <path d="M22 8v3M22 36v3M8 22h3M36 22h3" />
        <path d="M28 26c0-4 3-7 7-7" className="text-slate-400" strokeWidth={1.75} />
      </svg>
    );
  }
  if (code === 2) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-500`}>
        <circle cx="18" cy="18" r="7" className="text-amber-400" />
        <path d="M14 30c0-5 4-9 9-9s9 4 9 9" />
        <path d="M10 32h28" opacity={0.45} />
      </svg>
    );
  }
  if (code === 3) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-400`}>
        <path d="M14 28c0-6 5-11 11-11s11 5 11 11" />
        <path d="M10 30h28" opacity={0.5} />
      </svg>
    );
  }
  if ([45, 48].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-400`}>
        <path d="M12 32h24M16 28l-2 8M24 28l0 8M32 28l2 8" />
      </svg>
    );
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-blue-500`}>
        <path d="M14 22c0-5 4-9 9-9s9 4 9 9v2H14v-2z" />
        <path d="M18 28v6M24 28v8M30 28v6" />
      </svg>
    );
  }
  if ([71, 73, 75].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-cyan-400`}>
        <path d="M16 20l4 4 4-4 4 4" />
        <circle cx="20" cy="30" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="28" cy="32" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if ([95, 96, 99].includes(code)) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-violet-500`}>
        <path d="M12 24h8M28 24h8M24 12v8M20 32l4 8 4-8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...common} className={`${className} text-slate-500`}>
      <circle cx="24" cy="24" r="12" opacity={0.3} />
    </svg>
  );
}
