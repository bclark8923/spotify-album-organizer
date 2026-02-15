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
    console.error("Error fetching album metadata:", metadataResult.error);
    return NextResponse.json({ error: metadataResult.error.message }, { status: 500 });
  }
  if (albumTagsResult.error) {
    console.error("Error fetching album tags:", albumTagsResult.error);
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

  const errors: string[] = [];

  // Update metadata (listen_status and rating) - saved independently
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
      console.error("Error saving album metadata:", error);
      errors.push(`metadata: ${error.message}`);
    }
  }

  // Update tags - saved independently from metadata
  if (tags !== undefined) {
    // Remove existing tags for this album
    const { error: deleteError } = await supabase
      .from("album_tags")
      .delete()
      .eq("user_id", session.spotifyId)
      .eq("album_id", album_id);

    if (deleteError) {
      console.error("Error deleting album tags:", deleteError);
      errors.push(`tags delete: ${deleteError.message}`);
    } else if (tags.length > 0) {
      // Insert new tags
      const tagRows = tags.map((tagId: string) => ({
        user_id: session.spotifyId,
        album_id,
        tag_id: tagId,
      }));

      const { error: insertError } = await supabase.from("album_tags").insert(tagRows);

      if (insertError) {
        console.error("Error inserting album tags:", insertError);
        errors.push(`tags insert: ${insertError.message}`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.join("; "), partial: true },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
