"use client";

import { Tag } from "@/types";

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  listenStatusFilter: "all" | "to_listen" | "listened" | "unset";
  onListenStatusFilterChange: (filter: "all" | "to_listen" | "listened" | "unset") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
  listenStatusFilter,
  onListenStatusFilterChange,
  searchQuery,
  onSearchChange,
}: TagFilterProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border-b border-zinc-800">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search albums..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Listen status filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Status:</span>
        {(
          [
            { key: "all", label: "All" },
            { key: "to_listen", label: "To Listen" },
            { key: "listened", label: "Listened" },
            { key: "unset", label: "No Status" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onListenStatusFilterChange(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              listenStatusFilter === key
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Tags:</span>
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedTags.includes(tag.id)
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {tag.name}
          </button>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-zinc-600">No tags yet</span>
        )}
      </div>
    </div>
  );
}
