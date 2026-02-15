"use client";

import Image from "next/image";
import { AlbumWithMetadata, Tag } from "@/types";

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

interface AlbumCardProps {
  album: AlbumWithMetadata;
  onClick: () => void;
  onPlay: () => void;
}

export default function AlbumCard({ album, onClick, onPlay }: AlbumCardProps) {
  const imageUrl = album.images[0]?.url || album.images[1]?.url;
  const artists = album.artists.map((a) => a.name).join(", ");

  return (
    <div
      className="group relative bg-zinc-900 rounded-lg p-3 hover:bg-zinc-800 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Album art */}
      <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-zinc-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={album.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Play button overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:bg-green-400 hover:scale-105 cursor-pointer"
        >
          <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <h3 className="text-sm font-semibold text-white truncate">{album.name}</h3>
      <p className="text-xs text-zinc-400 truncate mt-0.5">{artists}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5">
        {album.total_tracks} track{album.total_tracks !== 1 ? "s" : ""}
        {album.duration_ms > 0 && ` · ${formatDuration(album.duration_ms)}`}
      </p>

      {/* Status row: listen status + rating */}
      <div className="flex items-center gap-1.5 mt-2">
        {album.metadata?.listen_status === "listened" && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
            Listened
          </span>
        )}
        {album.metadata?.listen_status === "to_listen" && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
            To Listen
          </span>
        )}
        {album.metadata?.rating != null && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400">
            ★ {album.metadata.rating.toFixed(album.metadata.rating % 1 === 0 ? 1 : 2)}
          </span>
        )}
      </div>

      {/* Tags */}
      {album.tags && album.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {album.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-700/80 text-zinc-300"
            >
              {tag.name}
            </span>
          ))}
          {album.tags.length > 3 && (
            <span className="text-[10px] text-zinc-500">
              +{album.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
