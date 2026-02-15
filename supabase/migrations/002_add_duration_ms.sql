-- Add duration_ms column to saved_albums if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_albums' AND column_name = 'duration_ms'
  ) THEN
    ALTER TABLE saved_albums ADD COLUMN duration_ms BIGINT DEFAULT 0;
  END IF;
END $$;
