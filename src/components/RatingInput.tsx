"use client";

import { useState } from "react";

interface RatingInputProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

export default function RatingInput({ value, onChange }: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const displayValue = hoverValue ?? value;

  // Generate marks for the slider: 0, 0.25, 0.50, ... 10.0
  const steps = Array.from({ length: 41 }, (_, i) => i * 0.25);

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 group cursor-pointer"
      >
        <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
          {value !== null && value !== undefined ? (
            <span className="flex items-center gap-1">
              <span className="text-lg font-bold text-yellow-400">
                {value.toFixed(value % 1 === 0 ? 1 : 2)}
              </span>
              <span className="text-xs text-zinc-500">/10</span>
            </span>
          ) : (
            <span className="text-zinc-500 hover:text-zinc-300">Rate</span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          step={0.25}
          value={displayValue ?? 0}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(val);
          }}
          onMouseMove={(e) => {
            const target = e.target as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const rawVal = percent * 10;
            const snapped = Math.round(rawVal * 4) / 4;
            setHoverValue(Math.max(0, Math.min(10, snapped)));
          }}
          onMouseLeave={() => setHoverValue(null)}
          className="flex-1 h-2 appearance-none bg-zinc-700 rounded-full cursor-pointer accent-yellow-400
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:cursor-pointer"
          list="rating-marks"
        />
        <datalist id="rating-marks">
          {steps.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <span className="text-lg font-bold text-yellow-400 w-12 text-right">
          {displayValue !== null && displayValue !== undefined
            ? displayValue.toFixed(displayValue % 1 === 0 ? 1 : 2)
            : "—"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(false)}
          className="text-xs text-zinc-400 hover:text-white cursor-pointer"
        >
          Done
        </button>
        <button
          onClick={() => {
            onChange(null);
            setIsEditing(false);
          }}
          className="text-xs text-zinc-500 hover:text-red-400 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
