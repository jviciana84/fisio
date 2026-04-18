"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Clave local YYYY-MM-DD */
export function localDayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function localDayKeyFromIso(iso: string): string {
  return localDayKeyFromDate(new Date(iso));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type Cell = { date: Date; inCurrentMonth: boolean; key: string };

export function IngresosDayCalendar({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: string | null;
  onSelectDay: (dayKey: string | null) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  const { cells, viewY, viewM } = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(y, m, 1 - mondayOffset);
    const list: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(start, i);
      const inCurrentMonth = date.getMonth() === m && date.getFullYear() === y;
      list.push({ date, inCurrentMonth, key: localDayKeyFromDate(date) });
    }
    return { cells: list, viewY: y, viewM: m };
  }, [viewMonth]);

  const title = viewMonth.toLocaleDateString("es-ES", { month: "short", year: "numeric" });

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/40 p-1">
      <div className="flex items-center justify-between gap-1 rounded-md bg-slate-100/70 px-0.5 py-0.5">
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-white/90 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900"
          onClick={() => setViewMonth((v) => addMonths(v, -1))}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[9px] font-semibold capitalize leading-none text-slate-800">
          {title}
        </p>
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-white/90 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900"
          onClick={() => setViewMonth((v) => addMonths(v, 1))}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 gap-px rounded-md bg-slate-200/40 p-px text-center leading-none">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-white/60 py-0.5 text-[7px] font-semibold text-slate-500">
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          const { date, inCurrentMonth, key } = cell;
          const isSelected = selectedDay === key;
          const isToday = localDayKeyFromDate(new Date()) === key;
          return (
            <button
              key={`${viewY}-${viewM}-${i}-${key}`}
              type="button"
              onClick={() => {
                onSelectDay(isSelected ? null : key);
                if (!inCurrentMonth) setViewMonth(startOfMonth(date));
              }}
              className={cn(
                "flex h-5 w-full min-w-0 items-center justify-center rounded-[3px] text-[8px] font-semibold transition",
                !inCurrentMonth && "bg-white/30 text-slate-400",
                inCurrentMonth && "bg-white/85 text-slate-800",
                isToday && !isSelected && "ring-1 ring-blue-400/80",
                isSelected
                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/40"
                  : inCurrentMonth && "hover:bg-white",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <button
          type="button"
          className="mt-1.5 w-full truncate text-center text-[8px] font-semibold text-blue-700 underline decoration-blue-400/50 underline-offset-2 hover:text-blue-900"
          onClick={() => onSelectDay(null)}
        >
          Quitar día
        </button>
      ) : (
        <p className="mt-1.5 text-center text-[7px] leading-tight text-slate-500">Pulsa un día.</p>
      )}
    </div>
  );
}
