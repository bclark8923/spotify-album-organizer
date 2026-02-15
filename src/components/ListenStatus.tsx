"use client";

interface ListenStatusProps {
  status: "to_listen" | "listened" | null;
  onChange: (status: "to_listen" | "listened" | null) => void;
}

export default function ListenStatus({ status, onChange }: ListenStatusProps) {
  return (
    <select
      value={status ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? null : (val as "to_listen" | "listened"));
      }}
      className={`px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer appearance-none bg-no-repeat bg-[length:16px_16px] bg-[right_8px_center] pr-8 focus:outline-none focus:ring-1 focus:ring-zinc-500 ${
        status === "listened"
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : status === "to_listen"
          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
          : "bg-zinc-800 text-zinc-400 border-zinc-700"
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
      }}
    >
      <option value="">Not set</option>
      <option value="to_listen">To Listen</option>
      <option value="listened">Listened</option>
    </select>
  );
}
