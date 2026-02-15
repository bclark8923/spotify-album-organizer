"use client";

import Image from "next/image";
import { AlbumWithMetadata, Tag } from "@/types";

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

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {/* Listen status badge */}
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

        {/* Rating badge */}
        {album.metadata?.rating != null && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400">
            {album.metadata.rating.toFixed(album.metadata.rating % 1 === 0 ? 1 : 2)}
          </span>
        )}

        {/* Tag count */}
        {album.tags && album.tags.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400">
            {album.tags.length} tag{album.tags.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
