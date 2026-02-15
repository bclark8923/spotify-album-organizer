import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// GET /api/album-metadata - Get all metadata + tags for user's albums
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const [metadataResult, albumTagsResult] = await Promise.all([
    supabase
      .from("album_metadata")
      .select("*")
      .eq("user_id", session.spotifyId),
    supabase
      .from("album_tags")
      .select("*, tags(*)")
      .eq("user_id", session.spotifyId),
  ]);

  if (metadataResult.error) {
    return NextResponse.json({ error: metadataResult.error.message }, { status: 500 });
  }
  if (albumTagsResult.error) {
    return NextResponse.json({ error: albumTagsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    metadata: metadataResult.data,
    albumTags: albumTagsResult.data,
  });
}

// POST /api/album-metadata - Update metadata for an album
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { album_id, listen_status, rating, tags } = body;

  if (!album_id) {
    return NextResponse.json({ error: "album_id required" }, { status: 400 });
  }

  // Validate rating
  if (rating !== undefined && rating !== null) {
    if (rating < 0 || rating > 10 || (rating * 4) % 1 !== 0) {
      return NextResponse.json(
        { error: "Rating must be 0.0-10.0 in 0.25 increments" },
        { status: 400 }
      );
    }
  }

  // Update metadata (listen_status and rating)
  if (listen_status !== undefined || rating !== undefined) {
    const updateData: Record<string, unknown> = {
      user_id: session.spotifyId,
      album_id,
      updated_at: new Date().toISOString(),
    };

    if (listen_status !== undefined) updateData.listen_status = listen_status;
    if (rating !== undefined) updateData.rating = rating;

    const { error } = await supabase
      .from("album_metadata")
      .upsert(updateData, { onConflict: "user_id,album_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update tags
  if (tags !== undefined) {
    // Remove existing tags for this album
    await supabase
      .from("album_tags")
      .delete()
      .eq("user_id", session.spotifyId)
      .eq("album_id", album_id);

    // Insert new tags
    if (tags.length > 0) {
      const tagRows = tags.map((tagId: string) => ({
        user_id: session.spotifyId,
        album_id,
        tag_id: tagId,
      }));

      const { error } = await supabase.from("album_tags").insert(tagRows);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
