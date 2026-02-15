-- Saved albums: synced from Spotify, stores album data per user
CREATE TABLE IF NOT EXISTS saved_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  spotify_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artists JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  release_date TEXT,
  total_tracks INTEGER,
  duration_ms BIGINT DEFAULT 0,
  uri TEXT,
  external_url TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_albums_user ON saved_albums(user_id);

-- Tags table: stores user-defined tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Album tags: many-to-many relationship between albums and tags
CREATE TABLE IF NOT EXISTS album_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id, tag_id)
);

-- Album metadata: listen status and rating per album per user
CREATE TABLE IF NOT EXISTS album_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  listen_status TEXT CHECK (listen_status IN ('to_listen', 'listened')),
  rating NUMERIC(4,2) CHECK (rating >= 0 AND rating <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- Deleted albums: tracks albums the user removed from this app so sync doesn't re-add them
CREATE TABLE IF NOT EXISTS deleted_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  spotify_id TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_albums_user ON deleted_albums(user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_album_tags_user_album ON album_tags(user_id, album_id);
CREATE INDEX IF NOT EXISTS idx_album_tags_tag ON album_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_album_metadata_user ON album_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_album_metadata_user_album ON album_metadata(user_id, album_id);
