"use client";

import { useState } from "react";

interface RatingInputProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

export default function RatingInput({ value, onChange }: RatingInputProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const BAR_COUNT = 40;
  const displayValue = hoverIndex !== null ? (hoverIndex + 1) * 0.25 : value;

  const getBarColor = (index: number) => {
    const rating = (index + 1) * 0.25;
    if (rating <= 2.5) return "bg-red-500";
    if (rating <= 5.0) return "bg-orange-400";
    if (rating <= 7.5) return "bg-yellow-400";
    return "bg-green-400";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-end gap-[2px] h-6 flex-1"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const isActive =
              hoverIndex !== null
                ? i <= hoverIndex
                : value !== null && (i + 1) * 0.25 <= value;

            return (
              <button
                key={i}
                type="button"
                className={`flex-1 rounded-sm transition-all cursor-pointer ${
                  isActive ? getBarColor(i) : "bg-zinc-700 hover:bg-zinc-600"
                }`}
                style={{ height: "100%" }}
                onMouseEnter={() => setHoverIndex(i)}
                onClick={() => {
                  const newRating = (i + 1) * 0.25;
                  // Click same value to deselect
                  if (value === newRating) {
                    onChange(null);
                  } else {
                    onChange(newRating);
                  }
                }}
                title={`${((i + 1) * 0.25).toFixed(2)}`}
              />
            );
          })}
        </div>
        <span className="text-lg font-bold text-yellow-400 w-12 text-right tabular-nums">
          {displayValue !== null && displayValue !== undefined
            ? displayValue.toFixed(displayValue % 1 === 0 ? 1 : 2)
            : "—"}
        </span>
      </div>
      {value !== null && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-zinc-500 hover:text-red-400 cursor-pointer self-start"
        >
          Clear rating
        </button>
      )}
    </div>
  );
}
