import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_TAGS } from "@/types";

// GET /api/tags - Get all tags for the user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: tags, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", session.spotifyId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(tags);
}

// POST /api/tags - Create a tag (or seed defaults)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();

  // Seed default tags
  if (body.seed) {
    const tagsToInsert = DEFAULT_TAGS.map((name) => ({
      user_id: session.spotifyId,
      name,
    }));

    const { data, error } = await supabase
      .from("tags")
      .upsert(tagsToInsert, { onConflict: "user_id,name" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Create single tag
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Tag name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tags")
    .upsert(
      { user_id: session.spotifyId, name: body.name.trim() },
      { onConflict: "user_id,name" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/tags - Delete a tag
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get("id");

  if (!tagId) {
    return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", session.spotifyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
