import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllSavedAlbums } from "@/lib/spotify";
import { getSupabase } from "@/lib/supabase";
import { SpotifyAlbum } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Fetch all saved albums from Spotify
    const spotifyAlbums = await getAllSavedAlbums(session.accessToken);

    // Sync albums to Supabase
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

      // Upsert in batches of 500 to avoid payload limits
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

    // Return all albums from Supabase (includes both current Spotify saves and previously saved albums)
    const { data: allAlbums } = await supabase
      .from("saved_albums")
      .select("*")
      .eq("user_id", session.spotifyId)
      .order("name");

    if (allAlbums && allAlbums.length > 0) {
      const albums: SpotifyAlbum[] = allAlbums.map((row) => ({
        id: row.spotify_id,
        name: row.name,
        artists: row.artists,
        images: row.images,
        release_date: row.release_date || "",
        total_tracks: row.total_tracks || 0,
        uri: row.uri || "",
        external_urls: { spotify: row.external_url || "" },
      }));
      return NextResponse.json(albums);
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
        const albums: SpotifyAlbum[] = savedAlbums.map((row) => ({
          id: row.spotify_id,
          name: row.name,
          artists: row.artists,
          images: row.images,
          release_date: row.release_date || "",
          total_tracks: row.total_tracks || 0,
          uri: row.uri || "",
          external_urls: { spotify: row.external_url || "" },
        }));
        return NextResponse.json(albums);
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
