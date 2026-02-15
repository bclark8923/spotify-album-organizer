"use client";

interface ListenStatusProps {
  status: "to_listen" | "listened" | null;
  onChange: (status: "to_listen" | "listened" | null) => void;
}

export default function ListenStatus({ status, onChange }: ListenStatusProps) {
  const cycle = () => {
    if (status === null) onChange("to_listen");
    else if (status === "to_listen") onChange("listened");
    else onChange(null);
  };

  return (
    <button
      onClick={cycle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
        status === "listened"
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : status === "to_listen"
          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
      }`}
      title={
        status === null
          ? "Click to mark as 'To Listen'"
          : status === "to_listen"
          ? "Click to mark as 'Listened'"
          : "Click to clear status"
      }
    >
      {status === "listened" ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Listened
        </>
      ) : status === "to_listen" ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          To Listen
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Not set
        </>
      )}
    </button>
  );
}
