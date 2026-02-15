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

export default function AlbumGrid() {
  const { data: session } = useSession();
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [metadata, setMetadata] = useState<AlbumMetadata[]>([]);
  const [albumTags, setAlbumTags] = useState<AlbumTagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithMetadata | null>(null);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [listenStatusFilter, setListenStatusFilter] = useState<"all" | "to_listen" | "listened" | "unset">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "artist" | "date" | "rating">("name");

  const fetchAlbums = useCallback(async (isBackground = false) => {
    if (!isBackground) setSyncing(true);
    try {
      const res = await fetch("/api/albums");
      if (res.ok) {
        const data = await res.json();
        setAlbums(data);
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch albums:", error);
    } finally {
      if (!isBackground) setSyncing(false);
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
      setLoading(true);
      setSyncing(true);
      await Promise.all([fetchAlbums(), fetchTags(), fetchMetadata()]);
      setSyncing(false);
      setLoading(false);
    };

    loadData();

    // Auto-sync albums every 5 minutes to pick up newly saved albums
    syncIntervalRef.current = setInterval(() => {
      fetchAlbums(true);
    }, 5 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [session, fetchAlbums, fetchTags, fetchMetadata]);

  // Seed default tags on first load if none exist
  useEffect(() => {
    if (!loading && tags.length === 0 && session) {
      seedTags();
    }
  }, [loading, tags.length, session, seedTags]);

  // Build enriched albums
  const enrichedAlbums: AlbumWithMetadata[] = useMemo(() => {
    return albums.map((album) => ({
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
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "artist":
          return (a.artists[0]?.name || "").localeCompare(b.artists[0]?.name || "");
        case "date":
          return b.release_date.localeCompare(a.release_date);
        case "rating":
          return (b.metadata?.rating ?? -1) - (a.metadata?.rating ?? -1);
        default:
          return 0;
      }
    });

    return result;
  }, [enrichedAlbums, searchQuery, selectedTagFilters, listenStatusFilter, sortBy]);

  const handleUpdateMetadata = async (
    albumId: string,
    data: {
      listen_status?: "to_listen" | "listened" | null;
      rating?: number | null;
      tags?: string[];
    }
  ) => {
    try {
      await fetch("/api/album-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ album_id: albumId, ...data }),
      });

      // Refetch metadata
      await fetchMetadata();

      // Update selected album if it's the one being edited
      if (selectedAlbum?.id === albumId) {
        const updated = enrichedAlbums.find((a) => a.id === albumId);
        if (updated) {
          // Re-enrich with latest metadata after fetchMetadata completes
          setSelectedAlbum((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              metadata: data.listen_status !== undefined || data.rating !== undefined
                ? {
                    ...prev.metadata,
                    id: prev.metadata?.id || "",
                    user_id: prev.metadata?.user_id || "",
                    album_id: albumId,
                    listen_status: data.listen_status !== undefined ? data.listen_status : (prev.metadata?.listen_status || null),
                    rating: data.rating !== undefined ? data.rating : (prev.metadata?.rating ?? null),
                  }
                : prev.metadata,
              tags: data.tags !== undefined
                ? tags.filter((t) => data.tags!.includes(t.id))
                : prev.tags,
            };
          });
        }
      }
    } catch (error) {
      console.error("Failed to update metadata:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Syncing albums from Spotify...</p>
        </div>
      </div>
    );
  }

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
            onClick={() => fetchAlbums()}
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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Sort:</span>
          {(
            [
              { key: "name", label: "Name" },
              { key: "artist", label: "Artist" },
              { key: "date", label: "Date" },
              { key: "rating", label: "Rating" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                sortBy === key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
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
        />
      )}
    </div>
  );
}
