"use client";

import { useState } from "react";
import Image from "next/image";
import { AlbumWithMetadata, Tag } from "@/types";
import TagManager from "./TagManager";
import RatingInput from "./RatingInput";
import ListenStatus from "./ListenStatus";

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

interface AlbumDetailProps {
  album: AlbumWithMetadata;
  allTags: Tag[];
  onClose: () => void;
  onPlay: () => void;
  onUpdateMetadata: (albumId: string, data: {
    listen_status?: "to_listen" | "listened" | null;
    rating?: number | null;
    tags?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  onCreateTag: (name: string) => void;
  onDeleteAlbum: (albumId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function AlbumDetail({
  album,
  allTags,
  onClose,
  onPlay,
  onUpdateMetadata,
  onCreateTag,
  onDeleteAlbum,
}: AlbumDetailProps) {
  const imageUrl = album.images[0]?.url;
  const artists = album.artists.map((a) => a.name).join(", ");

  // Local editable state
  const [listenStatus, setListenStatus] = useState<"to_listen" | "listened" | null>(
    album.metadata?.listen_status || null
  );
  const [rating, setRating] = useState<number | null>(album.metadata?.rating ?? null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    album.tags?.map((t) => t.id) || []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Track if anything has changed
  const originalStatus = album.metadata?.listen_status || null;
  const originalRating = album.metadata?.rating ?? null;
  const originalTagIds = album.tags?.map((t) => t.id) || [];
  const hasChanges =
    listenStatus !== originalStatus ||
    rating !== originalRating ||
    JSON.stringify([...selectedTagIds].sort()) !== JSON.stringify([...originalTagIds].sort());

  const handleTagToggle = (tagId: string, assigned: boolean) => {
    setSelectedTagIds((prev) =>
      assigned ? [...prev, tagId] : prev.filter((id) => id !== tagId)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await onUpdateMetadata(album.id, {
      listen_status: listenStatus,
      rating,
      tags: selectedTagIds,
    });
    setSaving(false);
    if (result.success) {
      onClose();
    } else {
      setSaveError(result.error || "Failed to save changes");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setSaveError(null);
    const result = await onDeleteAlbum(album.id);
    setDeleting(false);
    if (!result.success) {
      setSaveError(result.error || "Failed to delete album");
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with album art */}
        <div className="relative">
          <div className="flex gap-4 p-6">
            {imageUrl && (
              <div className="relative w-40 h-40 rounded-lg overflow-hidden shrink-0 shadow-2xl">
                <Image
                  src={imageUrl}
                  alt={album.name}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-col justify-end min-w-0">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Album</p>
              <h2 className="text-xl font-bold text-white leading-tight">{album.name}</h2>
              <p className="text-sm text-zinc-400 mt-1">{artists}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {album.release_date} &middot; {album.total_tracks} track{album.total_tracks !== 1 ? "s" : ""}
                {album.duration_ms > 0 && ` · ${formatDuration(album.duration_ms)}`}
              </p>

              {/* Play button */}
              <button
                onClick={onPlay}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-400 rounded-full text-sm font-semibold text-black transition-colors w-fit cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata section */}
        <div className="px-6 pb-6 space-y-5">
          {/* Listen Status */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Listen Status
            </h3>
            <ListenStatus
              status={listenStatus}
              onChange={setListenStatus}
            />
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Rating
            </h3>
            <RatingInput
              value={rating}
              onChange={(val) => {
                setRating(val);
                if (val !== null) {
                  setListenStatus("listened");
                }
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Tags
            </h3>
            <TagManager
              allTags={allTags}
              albumTags={selectedTagIds}
              onToggle={handleTagToggle}
              onCreateTag={onCreateTag}
            />
          </div>

          {/* Error message */}
          {saveError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              hasChanges && !saving
                ? "bg-green-500 hover:bg-green-400 text-black"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </button>

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <a
              href={album.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-green-400 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Open in Spotify
            </a>

            {/* Delete button */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Remove album?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete album
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
