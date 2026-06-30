import { useState, useRef, useEffect } from "react";
import React from 'react';

/**
 * TimePicker Component
 *
 * Props:
 *   value      — current time as integer e.g. 900, 1030, 1700
 *   onChange   — callback with new integer time value
 *   label      — label text e.g. "Start Time" / "End Time"
 *   minTime?   — optional minimum time integer (e.g. pass startTime as minTime for endTime picker)
 *   className? — extra classes for the trigger button
 *   small?     — compact mode for inline edit rows
 */

interface TimePickerProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  minTime?: number;
  className?: string;
  small?: boolean;
}

// Convert integer like 900 → { h: 9, m: 0 }
const intToHM = (val: number) => {
  const str = val.toString().padStart(4, "0");
  return { h: parseInt(str.slice(0, 2)), m: parseInt(str.slice(2)) };
};

// Convert { h, m } → integer like 900
const hmToInt = (h: number, m: number) => h * 100 + m;

// Format integer to display string like 900 → "09:00 AM"
const formatDisplay = (val: number) => {
  if (!val && val !== 0) return "--:--";
  const { h, m } = intToHM(val);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);      // 0-23
const MINUTES = [0, 15, 30, 45];                              // quarter hours only

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  minTime,
  className = "",
  small = false,
}) => {
  const [open, setOpen] = useState(false);
  const { h: initH, m: initM } = intToHM(value || 900);
  const [selH, setSelH] = useState(initH);
  const [selM, setSelM] = useState(initM);
  const ref = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    const { h, m } = intToHM(value || 900);
    setSelH(h);
    setSelM(m);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected hour/minute into center when opening
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (hourRef.current) {
        const btn = hourRef.current.querySelector(`[data-h="${selH}"]`) as HTMLElement;
        if (btn) btn.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      if (minRef.current) {
        const btn = minRef.current.querySelector(`[data-m="${selM}"]`) as HTMLElement;
        if (btn) btn.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 50);
  }, [open]);

  const handleSelect = (h: number, m: number) => {
    const newVal = hmToInt(h, m);
    // Enforce minTime constraint
    if (minTime !== undefined && newVal <= minTime) return;
    setSelH(h);
    setSelM(m);
    onChange(newVal);
    setOpen(false);
  };

  const isDisabled = (h: number, m: number) => {
    if (minTime === undefined) return false;
    return hmToInt(h, m) <= minTime;
  };

  const triggerBase = small
    ? "bg-white border border-blue-200 rounded-lg px-2 py-2 text-xs font-bold text-blue-900 flex items-center gap-1.5 cursor-pointer hover:border-blue-400 transition-all w-full"
    : "w-full bg-gray-50 p-5 text-sm font-bold rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-all border-2 border-transparent hover:border-blue-100";

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Label */}
      {!small && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
          {label}
        </p>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerBase}
      >
        {/* Clock icon */}
        <svg
          className={`${small ? "w-3 h-3" : "w-4 h-4"} text-[#005a9c] shrink-0`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className={`${small ? "text-xs" : "text-sm"} font-black text-gray-800`}>
          {formatDisplay(value)}
        </span>
        {small && (
          <span className="text-[9px] text-gray-400 uppercase font-bold ml-auto">{label}</span>
        )}
        {!small && (
          <svg
            className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {/* Dropdown Clock Panel */}
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 sm:left-0 sm:right-auto origin-top-right sm:origin-top-left bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden w-64">
          {/* Header */}
          <div className="bg-[#005a9c] px-4 py-3 flex items-center justify-between">
            <span className="text-white text-[10px] font-black uppercase tracking-widest">{label}</span>
            <span className="text-white font-black text-lg tracking-tight">
              {selH.toString().padStart(2, "0")}:{selM.toString().padStart(2, "0")}
              <span className="text-blue-200 text-xs ml-1">{selH >= 12 ? "PM" : "AM"}</span>
            </span>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-4 py-2 border-r border-gray-100">
              Hour
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-4 py-2">
              Minute
            </div>
          </div>

          {/* Scrollable Columns */}
          <div className="grid grid-cols-2 h-48">
            {/* Hours Column */}
            <div
              ref={hourRef}
              className="overflow-y-auto border-r border-gray-100 custom-scrollbar"
            >
              {HOURS.map((h) => {
                const ampm = h >= 12 ? "PM" : "AM";
                const h12 = h % 12 || 12;
                const anyMinValid = MINUTES.some((m) => !isDisabled(h, m));
                const isSelected = h === selH;
                return (
                  <button
                    key={h}
                    data-h={h}
                    type="button"
                    disabled={!anyMinValid}
                    onClick={() => {
                      setSelH(h);
                      // auto pick first valid minute in this hour
                      const firstValid = MINUTES.find((m) => !isDisabled(h, m));
                      if (firstValid !== undefined) setSelM(firstValid);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between
                      ${isSelected ? "bg-[#005a9c] text-white" : "text-gray-700 hover:bg-blue-50"}
                      ${!anyMinValid ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <span>{h12}</span>
                    <span className={`text-[9px] font-black ${isSelected ? "text-blue-200" : "text-gray-400"}`}>
                      {ampm}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Minutes Column */}
            <div
              ref={minRef}
              className="overflow-y-auto custom-scrollbar"
            >
              {MINUTES.map((m) => {
                const disabled = isDisabled(selH, m);
                const isSelected = m === selM;
                return (
                  <button
                    key={m}
                    data-m={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelect(selH, m)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all
                      ${isSelected ? "bg-[#005a9c] text-white" : "text-gray-700 hover:bg-blue-50"}
                      ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    :{m.toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              {minTime !== undefined ? `After ${formatDisplay(minTime)}` : "Select time"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] font-black text-[#005a9c] uppercase tracking-widest hover:text-blue-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};