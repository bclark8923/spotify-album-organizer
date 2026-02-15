import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllSavedAlbums } from "@/lib/spotify";
import { getSupabase } from "@/lib/supabase";
import { SpotifyAlbum } from "@/types";

function rowsToAlbums(rows: Record<string, unknown>[]): SpotifyAlbum[] {
  return rows.map((row) => ({
    id: row.spotify_id as string,
    name: row.name as string,
    artists: row.artists as SpotifyAlbum["artists"],
    images: row.images as SpotifyAlbum["images"],
    release_date: (row.release_date as string) || "",
    total_tracks: (row.total_tracks as number) || 0,
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
    const spotifyAlbums = await getAllSavedAlbums(session.accessToken);

    if (spotifyAlbums.length > 0) {
      const rows = spotifyAlbums.map((album) => ({
        user_id: session.spotifyId,
        spotify_id: album.id,
        name: album.name,
        artists: album.artists,
        images: album.images,
        release_date: album.release_date,
        total_tracks: album.total_tracks,
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

    return NextResponse.json(spotifyAlbums);
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
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { album_id } = body;

  if (!album_id) {
    return NextResponse.json({ error: "album_id required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const errors: string[] = [];

  // 1. Delete album_tags for this album
  const { error: tagsError } = await supabase
    .from("album_tags")
    .delete()
    .eq("user_id", session.spotifyId)
    .eq("album_id", album_id);

  if (tagsError) {
    console.error("Error deleting album tags:", tagsError);
    errors.push("Failed to delete tags");
  }

  // 2. Delete album_metadata for this album
  const { error: metaError } = await supabase
    .from("album_metadata")
    .delete()
    .eq("user_id", session.spotifyId)
    .eq("album_id", album_id);

  if (metaError) {
    console.error("Error deleting album metadata:", metaError);
    errors.push("Failed to delete metadata");
  }

  // 3. Delete from saved_albums
  const { error: albumError } = await supabase
    .from("saved_albums")
    .delete()
    .eq("user_id", session.spotifyId)
    .eq("spotify_id", album_id);

  if (albumError) {
    console.error("Error deleting saved album:", albumError);
    errors.push("Failed to delete album from database");
  }

  // 4. Unsave from Spotify library
  try {
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/me/albums?ids=${album_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!spotifyRes.ok) {
      const errorText = await spotifyRes.text();
      console.error("Spotify unsave error:", spotifyRes.status, errorText);
      errors.push("Failed to unsave from Spotify");
    }
  } catch (error) {
    console.error("Spotify unsave error:", error);
    errors.push("Failed to reach Spotify");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.join("; "), partial: true },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true });
}
