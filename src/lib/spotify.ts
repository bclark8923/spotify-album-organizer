import { SpotifyAlbum, SpotifyDevice } from "@/types";

const SPOTIFY_API = "https://api.spotify.com/v1";

async function fetchWithToken(url: string, accessToken: string, options?: RequestInit) {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
      if (retryAfter > 60) {
        throw new Error("Spotify rate limit too long, please try again later");
      }
      const waitMs = retryAfter * 1000;
      console.log(`[Spotify] Rate limited, retrying in ${retryAfter}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Spotify API error ${res.status}: ${error}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }
}

export async function getSavedAlbums(
  accessToken: string,
  limit = 50,
  offset = 0
): Promise<{ items: { album: SpotifyAlbum }[]; total: number; next: string | null }> {
  return fetchWithToken(
    `${SPOTIFY_API}/me/albums?limit=${limit}&offset=${offset}`,
    accessToken
  );
}

export async function getAllSavedAlbums(accessToken: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const data = await getSavedAlbums(accessToken, limit, offset);
    const batch = data.items
      .filter((item) => item && item.album)
      .map((item) => {
        const a = item.album;
        const raw = a as unknown as Record<string, unknown>;
        const tracks = raw.tracks as { items?: { duration_ms?: number }[] } | undefined;
        const duration_ms = tracks?.items?.reduce((sum, t) => sum + (t.duration_ms || 0), 0) || 0;
        return { ...a, duration_ms };
      });

    if (offset === 0 && batch.length > 0) {
      const sample = batch[0];
      const rawSample = data.items[0]?.album as unknown as Record<string, unknown>;
      console.log("[Spotify] Sample album duration:", {
        name: sample.name,
        duration_ms: sample.duration_ms,
        has_tracks: !!rawSample?.tracks,
        track_count: (rawSample?.tracks as { items?: unknown[] })?.items?.length,
      });
    }

    albums.push(...batch);

    if (!data.next) break;
    offset += limit;
  }

  return albums;
}

export async function getDevices(accessToken: string): Promise<SpotifyDevice[]> {
  const data = await fetchWithToken(`${SPOTIFY_API}/me/player/devices`, accessToken);
  return data.devices;
}

export async function playAlbum(
  accessToken: string,
  albumUri: string,
  deviceId?: string
): Promise<void> {
  const url = deviceId
    ? `${SPOTIFY_API}/me/player/play?device_id=${deviceId}`
    : `${SPOTIFY_API}/me/player/play`;

  await fetchWithToken(url, accessToken, {
    method: "PUT",
    body: JSON.stringify({ context_uri: albumUri }),
  });
}

export async function pausePlayback(accessToken: string, deviceId?: string): Promise<void> {
  const url = deviceId
    ? `${SPOTIFY_API}/me/player/pause?device_id=${deviceId}`
    : `${SPOTIFY_API}/me/player/pause`;

  await fetchWithToken(url, accessToken, { method: "PUT" });
}

export async function transferPlayback(
  accessToken: string,
  deviceId: string,
  play = true
): Promise<void> {
  await fetchWithToken(`${SPOTIFY_API}/me/player`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export async function getPlaybackState(accessToken: string) {
  try {
    return await fetchWithToken(`${SPOTIFY_API}/me/player`, accessToken);
  } catch {
    return null;
  }
}

export async function skipToNext(accessToken: string): Promise<void> {
  await fetchWithToken(`${SPOTIFY_API}/me/player/next`, accessToken, {
    method: "POST",
  });
}

export async function skipToPrevious(accessToken: string): Promise<void> {
  await fetchWithToken(`${SPOTIFY_API}/me/player/previous`, accessToken, {
    method: "POST",
  });
}
