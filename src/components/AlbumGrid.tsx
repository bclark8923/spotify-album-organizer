"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { SpotifyAlbum, AlbumWithMetadata, Tag, AlbumMetadata } from "@/types";
import AlbumCard from "./AlbumCard";
import AlbumDetail from "./AlbumDetail";
import TagFilter from "./TagFilter";

interface AlbumTagRow {
  album_id: string;
  tag_id: string;
  tags: Tag;
}

function formatSyncWarning(warning: string): string {
  const match = warning.match(/Available again at (.+?)\./);
  if (!match) return warning;
  const availableAt = new Date(match[1]);
  const diffMs = availableAt.getTime() - Date.now();
  if (diffMs <= 0) return "Spotify rate limit expired. Showing cached albums.";
  const totalMin = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return `Spotify rate limited. Try again in ${parts.join(" ")}. Showing cached albums.`;
}

interface AlbumGridProps {
  searchQuery: string;
}

export default function AlbumGrid({ searchQuery }: AlbumGridProps) {
  const { data: session } = useSession();
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [metadata, setMetadata] = useState<AlbumMetadata[]>([]);
  const [albumTags, setAlbumTags] = useState<AlbumTagRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithMetadata | null>(null);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [listenStatusFilter, setListenStatusFilter] = useState<"all" | "to_listen" | "listened" | "unset">("all");
  const [sortBy, setSortBy] = useState<"name" | "artist" | "date" | "rating" | "tracks" | "duration">("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [syncWarningVisible, setSyncWarningVisible] = useState(false);
  const syncWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadCachedAlbums = useCallback(async (): Promise<SpotifyAlbum[]> => {
    try {
      const res = await fetch("/api/albums?source=cache");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setAlbums(data);
        }
        return data;
      }
    } catch (error) {
      console.error("Failed to load cached albums:", error);
    }
    return [];
  }, []);

  const syncAlbums = useCallback(async () => {
    setSyncing(true);
    setSyncWarning(null);
    try {
      const res = await fetch("/api/albums?source=sync");
      if (res.ok) {
        const data = await res.json();
        // Handle both array response (normal) and { albums, warning } (fallback)
        if (Array.isArray(data)) {
          setAlbums(data);
        } else if (data.albums) {
          setAlbums(data.albums);
          if (data.warning) {
            setSyncWarning(formatSyncWarning(data.warning));
          }
        }
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error("Failed to sync albums:", error);
    } finally {
      setSyncing(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const res = await fetch("/api/album-metadata");
      if (res.ok) {
        const data = await res.json();
        setMetadata(data.metadata || []);
        setAlbumTags(data.albumTags || []);
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
  }, []);

  const seedTags = useCallback(async () => {
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      await fetchTags();
    } catch (error) {
      console.error("Failed to seed tags:", error);
    }
  }, [fetchTags]);

  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      // Phase 1: load cached albums + tags + metadata from DB (fast)
      const [cachedRes] = await Promise.all([loadCachedAlbums(), fetchTags(), fetchMetadata()]);
      setInitialLoadDone(true);

      // Phase 2: only sync from Spotify if no cached albums (first signup)
      // After the initial sync, users can manually sync via the Sync button
      if (!cachedRes || cachedRes.length === 0) {
        syncAlbums();
      }
    };

    loadData();
  }, [session, loadCachedAlbums, syncAlbums, fetchTags, fetchMetadata]);

  // Auto-dismiss sync warning after 5 seconds
  useEffect(() => {
    if (syncWarning) {
      setSyncWarningVisible(true);
      if (syncWarningTimerRef.current) clearTimeout(syncWarningTimerRef.current);
      syncWarningTimerRef.current = setTimeout(() => {
        setSyncWarningVisible(false);
        syncWarningTimerRef.current = setTimeout(() => setSyncWarning(null), 500);
      }, 5000);
    }
    return () => {
      if (syncWarningTimerRef.current) clearTimeout(syncWarningTimerRef.current);
    };
  }, [syncWarning]);

  // Seed default tags on first load if none exist
  useEffect(() => {
    if (initialLoadDone && tags.length === 0 && session) {
      seedTags();
    }
  }, [initialLoadDone, tags.length, session, seedTags]);

  // Build enriched albums (deduplicate by spotify id)
  const enrichedAlbums: AlbumWithMetadata[] = useMemo(() => {
    const seen = new Set<string>();
    return albums
      .filter((album) => {
        if (seen.has(album.id)) return false;
        seen.add(album.id);
        return true;
      })
      .map((album) => ({
        ...album,
        metadata: metadata.find((m) => m.album_id === album.id),
        tags: albumTags
          .filter((at) => at.album_id === album.id)
          .map((at) => at.tags)
          .filter(Boolean),
      }));
  }, [albums, metadata, albumTags]);

  // Filter albums
  const filteredAlbums = useMemo(() => {
    let result = enrichedAlbums;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.artists.some((art) => art.name.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTagFilters.length > 0) {
      result = result.filter((a) =>
        selectedTagFilters.every((tagId) => a.tags?.some((t) => t.id === tagId))
      );
    }

    // Listen status filter
    if (listenStatusFilter !== "all") {
      result = result.filter((a) => {
        if (listenStatusFilter === "unset") return !a.metadata?.listen_status;
        return a.metadata?.listen_status === listenStatusFilter;
      });
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "artist":
          return dir * (a.artists[0]?.name || "").localeCompare(b.artists[0]?.name || "");
        case "date":
          return dir * a.release_date.localeCompare(b.release_date);
        case "rating":
          return dir * ((a.metadata?.rating ?? -1) - (b.metadata?.rating ?? -1));
        case "tracks":
          return dir * (a.total_tracks - b.total_tracks);
        case "duration":
          return dir * ((a.duration_ms || 0) - (b.duration_ms || 0));
        default:
          return 0;
      }
    });

    return result;
  }, [enrichedAlbums, searchQuery, selectedTagFilters, listenStatusFilter, sortBy, sortDir]);

  const handleUpdateMetadata = async (
    albumId: string,
    data: {
      listen_status?: "to_listen" | "listened" | null;
      rating?: number | null;
      tags?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/album-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ album_id: albumId, ...data }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to save metadata:", errorData);
        return { success: false, error: errorData.error || "Failed to save" };
      }

      // Refetch metadata to update the grid
      await fetchMetadata();
      return { success: true };
    } catch (error) {
      console.error("Failed to update metadata:", error);
      return { success: false, error: "Network error" };
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await fetchTags();
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleDeleteAlbum = async (
    albumId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/albums", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ album_id: albumId }),
      });

      if (!res.ok && res.status !== 207) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.error || "Failed to delete album" };
      }

      // Remove album from local state
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      setMetadata((prev) => prev.filter((m) => m.album_id !== albumId));
      setAlbumTags((prev) => prev.filter((at) => at.album_id !== albumId));
      setSelectedAlbum(null);

      return { success: true };
    } catch (error) {
      console.error("Failed to delete album:", error);
      return { success: false, error: "Network error" };
    }
  };

  const handlePlayAlbum = async (album: SpotifyAlbum) => {
    if (!session?.accessToken) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context_uri: album.uri }),
      });
    } catch {
      // If playback fails, open in Spotify
      window.open(album.external_urls.spotify, "_blank");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TagFilter
        tags={tags}
        selectedTags={selectedTagFilters}
        onToggleTag={(tagId) =>
          setSelectedTagFilters((prev) =>
            prev.includes(tagId)
              ? prev.filter((id) => id !== tagId)
              : [...prev, tagId]
          )
        }
        listenStatusFilter={listenStatusFilter}
        onListenStatusFilterChange={setListenStatusFilter}
      />

      {/* Sort + count bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
            {filteredAlbums.length} album{filteredAlbums.length !== 1 ? "s" : ""}
            {filteredAlbums.length !== enrichedAlbums.length && (
              <span className="text-zinc-600"> of {enrichedAlbums.length}</span>
            )}
          </p>
          <button
            onClick={() => syncAlbums()}
            disabled={syncing}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync albums from Spotify"
          >
            <svg
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? "Syncing..." : "Sync"}
          </button>
          {lastSynced && !syncing && (
            <span className="text-xs text-zinc-600">
              Last synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {syncWarning && (
            <span className={`text-xs text-amber-400 transition-opacity duration-500 ${syncWarningVisible ? "opacity-100" : "opacity-0"}`}>
              {syncWarning}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Sort:</span>
          {(
            [
              { key: "name", label: "Name", defaultDir: "asc" as const },
              { key: "artist", label: "Artist", defaultDir: "asc" as const },
              { key: "date", label: "Date", defaultDir: "desc" as const },
              { key: "rating", label: "Rating", defaultDir: "desc" as const },
              { key: "tracks", label: "Tracks", defaultDir: "asc" as const },
              { key: "duration", label: "Duration", defaultDir: "asc" as const },
            ] as const
          ).map(({ key, label, defaultDir }) => (
            <button
              key={key}
              onClick={() => {
                if (sortBy === key) {
                  setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                } else {
                  setSortBy(key);
                  setSortDir(defaultDir);
                }
              }}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                sortBy === key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
              {sortBy === key && (
                <span className="text-[10px]">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Album grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {filteredAlbums.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-500">No albums match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => setSelectedAlbum(album)}
                onPlay={() => handlePlayAlbum(album)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Album detail modal */}
      {selectedAlbum && (
        <AlbumDetail
          album={selectedAlbum}
          allTags={tags}
          onClose={() => setSelectedAlbum(null)}
          onPlay={() => handlePlayAlbum(selectedAlbum)}
          onUpdateMetadata={handleUpdateMetadata}
          onCreateTag={handleCreateTag}
          onDeleteAlbum={handleDeleteAlbum}
        />
      )}
    </div>
  );
}
