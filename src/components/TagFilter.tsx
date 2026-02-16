"use client";

import { useState } from "react";
import { Tag } from "@/types";

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  listenStatusFilter: "all" | "to_listen" | "listened" | "unset";
  onListenStatusFilterChange: (filter: "all" | "to_listen" | "listened" | "unset") => void;
  maxTracksFilter: number | null;
  onMaxTracksFilterChange: (value: number | null) => void;
}

const TAG_PREVIEW_COUNT = 5;

function TagList({
  tags,
  selectedTags,
  onToggleTag,
}: {
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleTags = expanded ? tags : tags.slice(0, TAG_PREVIEW_COUNT);
  const hasMore = tags.length > TAG_PREVIEW_COUNT;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-zinc-500 self-center mr-1">Tags:</span>
      {visibleTags.map((tag) => (
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
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          {expanded ? "View less" : `+${tags.length - TAG_PREVIEW_COUNT} more`}
        </button>
      )}
      {tags.length === 0 && (
        <span className="text-xs text-zinc-600">No tags yet</span>
      )}
    </div>
  );
}

export default function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
  listenStatusFilter,
  onListenStatusFilterChange,
  maxTracksFilter,
  onMaxTracksFilterChange,
}: TagFilterProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border-b border-zinc-800">
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

      {/* Track count filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Tracks:</span>
        <button
          onClick={() => onMaxTracksFilterChange(maxTracksFilter === 5 ? null : 5)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
            maxTracksFilter === 5
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
          }`}
        >
          &lt; 5 tracks
        </button>
      </div>

      {/* Tag filters */}
      <TagList tags={tags} selectedTags={selectedTags} onToggleTag={onToggleTag} />
    </div>
  );
}
