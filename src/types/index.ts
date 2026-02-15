export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; height: number; width: number }[];
  release_date: string;
  total_tracks: number;
  uri: string;
  external_urls: { spotify: string };
}

export interface Tag {
  id: string;
  name: string;
  user_id: string;
}

export interface AlbumMetadata {
  id: string;
  user_id: string;
  album_id: string;
  listen_status: "to_listen" | "listened" | null;
  rating: number | null;
}

export interface AlbumTag {
  id: string;
  user_id: string;
  album_id: string;
  tag_id: string;
}

export interface AlbumWithMetadata extends SpotifyAlbum {
  metadata?: AlbumMetadata;
  tags?: Tag[];
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export const DEFAULT_TAGS = [
  "Jazz",
  "Post",
  "Experimental",
  "Electronic",
  "EDM",
  "House",
  "Techno",
  "DnB",
  "Dubstep",
  "Rock",
  "Psychedelic",
  "Vinyl owned",
] as const;
