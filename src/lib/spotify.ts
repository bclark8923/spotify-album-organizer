import { SpotifyAlbum, SpotifyDevice } from "@/types";

const SPOTIFY_API = "https://api.spotify.com/v1";

async function fetchWithToken(url: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${error}`);
  }

  if (res.status === 204) return null;
  return res.json();
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
    albums.push(
      ...data.items
        .filter((item) => item && item.album)
        .map((item) => {
          const a = item.album;
          const tracks = (a as unknown as { tracks?: { items?: { duration_ms?: number }[] } }).tracks;
          const duration_ms = tracks?.items?.reduce((sum, t) => sum + (t.duration_ms || 0), 0) || 0;
          return { ...a, duration_ms };
        })
    );

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
