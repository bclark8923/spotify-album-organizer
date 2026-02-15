import { getSupabase } from "./supabase";

interface Migration {
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    name: "001_deduplicate_saved_albums",
    sql: `
      DELETE FROM saved_albums a
      USING saved_albums b
      WHERE a.user_id = b.user_id
        AND a.spotify_id = b.spotify_id
        AND a.id <> b.id
        AND (a.synced_at < b.synced_at OR (a.synced_at = b.synced_at AND a.id < b.id));

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'saved_albums_user_id_spotify_id_key'
        ) THEN
          ALTER TABLE saved_albums ADD CONSTRAINT saved_albums_user_id_spotify_id_key UNIQUE (user_id, spotify_id);
        END IF;
      END $$;
    `,
  },
  {
    name: "002_add_duration_ms",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'saved_albums' AND column_name = 'duration_ms'
        ) THEN
          ALTER TABLE saved_albums ADD COLUMN duration_ms BIGINT DEFAULT 0;
        END IF;
      END $$;
    `,
  },
];

let migrationRan = false;

export async function runMigrations() {
  if (migrationRan) return;
  migrationRan = true;

  try {
    const supabase = getSupabase();

    // Ensure schema_migrations table exists
    await supabase.rpc("exec_sql", {
      query: `CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );`,
    });

    // Get already-applied migrations
    const { data: applied } = await supabase
      .from("schema_migrations")
      .select("name");

    const appliedNames = new Set((applied || []).map((r) => r.name));

    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) continue;

      console.log(`[Migrations] Running: ${migration.name}`);

      const { error } = await supabase.rpc("exec_sql", {
        query: migration.sql,
      });

      if (error) {
        console.error(`[Migrations] Failed: ${migration.name}`, error);
        break;
      }

      // Record as applied
      await supabase
        .from("schema_migrations")
        .insert({ name: migration.name });

      console.log(`[Migrations] Applied: ${migration.name}`);
    }
  } catch (error) {
    console.error("[Migrations] Error running migrations:", error);
  }
}
