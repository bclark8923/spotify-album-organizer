export async function onRequestInit() {
  if (!(globalThis as Record<string, unknown>).__migrationsRan) {
    (globalThis as Record<string, unknown>).__migrationsRan = true;
    const { runMigrations } = await import("./lib/migrations");
    await runMigrations();
  }
}
