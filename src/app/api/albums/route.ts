import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { getAllSavedAlbums } from "@/lib/spotify";
import { getSupabase } from "@/lib/supabase";
import { SpotifyAlbum } from "@/types";

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

function rowsToAlbums(rows: Record<string, unknown>[]): SpotifyAlbum[] {
  return rows.map((row) => ({
    id: row.spotify_id as string,
    name: row.name as string,
    artists: row.artists as SpotifyAlbum["artists"],
    images: row.images as SpotifyAlbum["images"],
    release_date: (row.release_date as string) || "",
    total_tracks: (row.total_tracks as number) || 0,
    duration_ms: (row.duration_ms as number) || 0,
    uri: (row.uri as string) || "",
    external_urls: { spotify: (row.external_url as string) || "" },
  }));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const source = request.nextUrl.searchParams.get("source");

  // Fast path: return cached albums from Supabase only
  if (source === "cache") {
    const { data, error } = await supabase
      .from("saved_albums")
      .select("*")
      .eq("user_id", session.spotifyId)
      .order("name");

    if (error) {
      console.error("Error loading cached albums:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ? rowsToAlbums(data) : []);
  }

  // Full sync: fetch from Spotify, upsert to Supabase, return all
  try {
    let accessToken = session.accessToken;
    let spotifyAlbums: SpotifyAlbum[];

    try {
      spotifyAlbums = await getAllSavedAlbums(accessToken);
    } catch (err: unknown) {
      // If 401, try refreshing the token and retry once
      const isExpired = err instanceof Error && err.message.includes("401");
      if (!isExpired) throw err;

      const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const refreshToken = jwt?.refreshToken as string | undefined;
      if (!refreshToken) throw err;

      const newToken = await refreshSpotifyToken(refreshToken);
      if (!newToken) throw err;

      accessToken = newToken;
      spotifyAlbums = await getAllSavedAlbums(accessToken);
    }

    // Filter out albums the user has explicitly deleted from this app
    const { data: deletedRows } = await supabase
      .from("deleted_albums")
      .select("spotify_id")
      .eq("user_id", session.spotifyId);

    const deletedIds = new Set(
      (deletedRows || []).map((r: { spotify_id: string }) => r.spotify_id)
    );

    const filteredAlbums = spotifyAlbums.filter(
      (album) => !deletedIds.has(album.id)
    );

    const withDuration = filteredAlbums.filter((a) => a.duration_ms > 0).length;
    console.log(`[Albums] Sync: ${filteredAlbums.length} albums, ${withDuration} with duration_ms`);

    if (filteredAlbums.length > 0) {
      const rows = filteredAlbums.map((album) => ({
        user_id: session.spotifyId,
        spotify_id: album.id,
        name: album.name,
        artists: album.artists,
        images: album.images,
        release_date: album.release_date,
        total_tracks: album.total_tracks,
        duration_ms: album.duration_ms || 0,
        uri: album.uri,
        external_url: album.external_urls?.spotify || null,
        synced_at: new Date().toISOString(),
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("saved_albums")
          .upsert(batch, { onConflict: "user_id,spotify_id" });

        if (error) {
          console.error("Error syncing albums to Supabase:", error);
        }
      }
    }

    // Return all albums from Supabase (includes previously saved albums)
    const { data: allAlbums } = await supabase
      .from("saved_albums")
      .select("*")
      .eq("user_id", session.spotifyId)
      .order("name");

    if (allAlbums && allAlbums.length > 0) {
      return NextResponse.json(rowsToAlbums(allAlbums));
    }

    return NextResponse.json(filteredAlbums);
  } catch (error) {
    console.error("Error fetching albums:", error);

    // Fallback: return albums from Supabase if Spotify API fails
    try {
      const { data: savedAlbums } = await supabase
        .from("saved_albums")
        .select("*")
        .eq("user_id", session.spotifyId)
        .order("name");

      if (savedAlbums && savedAlbums.length > 0) {
        return NextResponse.json(rowsToAlbums(savedAlbums));
      }
    } catch (dbError) {
      console.error("Error loading albums from Supabase:", dbError);
    }

    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Use getToken instead of getServerSession to avoid triggering a Spotify
  // token refresh — the DELETE handler only needs the user's spotifyId.
  const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const spotifyId = jwt?.spotifyId as string | undefined;

  if (!spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { album_id } = body;

  if (!album_id) {
    return NextResponse.json({ error: "album_id required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Run all DB operations in parallel — they're independent
  const [tagsResult, metaResult, albumResult, deletedResult] = await Promise.all([
    supabase.from("album_tags").delete().eq("user_id", spotifyId).eq("album_id", album_id),
    supabase.from("album_metadata").delete().eq("user_id", spotifyId).eq("album_id", album_id),
    supabase.from("saved_albums").delete().eq("user_id", spotifyId).eq("spotify_id", album_id),
    supabase.from("deleted_albums").upsert(
      { user_id: spotifyId, spotify_id: album_id },
      { onConflict: "user_id,spotify_id" }
    ),
  ]);

  const errors: string[] = [];
  if (tagsResult.error) errors.push("Failed to delete tags");
  if (metaResult.error) errors.push("Failed to delete metadata");
  if (albumResult.error) errors.push("Failed to delete album from database");
  if (deletedResult.error) errors.push("Failed to track deletion");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.join("; "), partial: true },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true });
}
