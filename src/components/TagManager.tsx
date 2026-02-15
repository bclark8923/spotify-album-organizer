"use client";

import { useState } from "react";
import { Tag } from "@/types";

interface TagManagerProps {
  allTags: Tag[];
  albumTags: string[]; // tag IDs assigned to this album
  onToggle: (tagId: string, assigned: boolean) => void;
  onCreateTag: (name: string) => void;
}

export default function TagManager({
  allTags,
  albumTags,
  onToggle,
  onCreateTag,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");

  const handleCreate = () => {
    const name = newTagName.trim();
    if (!name) return;
    onCreateTag(name);
    setNewTagName("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isAssigned = albumTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id, !isAssigned)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isAssigned
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {isAssigned ? "✕ " : "+ "}
              {tag.name}
            </button>
          );
        })}
      </div>

      {/* Add new tag */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New tag..."
          className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-xs text-white font-medium transition-colors cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
}
