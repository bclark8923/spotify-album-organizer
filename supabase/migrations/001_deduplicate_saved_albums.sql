-- Remove duplicate saved_albums rows, keeping the most recently synced entry
DELETE FROM saved_albums a
USING saved_albums b
WHERE a.user_id = b.user_id
  AND a.spotify_id = b.spotify_id
  AND a.id <> b.id
  AND (a.synced_at < b.synced_at OR (a.synced_at = b.synced_at AND a.id < b.id));

-- Ensure the unique constraint exists (no-op if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saved_albums_user_id_spotify_id_key'
  ) THEN
    ALTER TABLE saved_albums ADD CONSTRAINT saved_albums_user_id_spotify_id_key UNIQUE (user_id, spotify_id);
  END IF;
END $$;
