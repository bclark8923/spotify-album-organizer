import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROMPT_ID = "pmpt_69914c6fa82c8195bdd076d0e93115210df6f0485c8873e3";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch listened albums with their metadata and tags
  const [albumsResult, metadataResult, albumTagsResult] = await Promise.all([
    supabase
      .from("saved_albums")
      .select("*")
      .eq("user_id", session.spotifyId),
    supabase
      .from("album_metadata")
      .select("*")
      .eq("user_id", session.spotifyId)
      .eq("listen_status", "listened"),
    supabase
      .from("album_tags")
      .select("*, tags(name)")
      .eq("user_id", session.spotifyId),
  ]);

  if (metadataResult.error) {
    console.error("Error fetching metadata for agent:", metadataResult.error);
    return NextResponse.json({ error: "Failed to load album data" }, { status: 500 });
  }

  // Build album_metadata array for listened albums only
  const listenedAlbumIds = new Set(
    metadataResult.data.map((m) => m.album_id)
  );

  const albums = albumsResult.data || [];
  const albumTags = albumTagsResult.data || [];

  const albumMetadata = metadataResult.data.map((meta) => {
    const album = albums.find((a) => a.spotify_id === meta.album_id);
    const tags = albumTags
      .filter((at) => at.album_id === meta.album_id)
      .map((at) => at.tags?.name)
      .filter(Boolean);

    return {
      name: album?.name || "Unknown",
      artist: album?.artists?.[0]?.name || "Unknown",
      tags,
      rating: meta.rating,
    };
  });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        prompt: {
          id: PROMPT_ID,
          variables: {
            album_metadata: JSON.stringify(albumMetadata),
          },
        },
        input: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to get response from agent" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Extract text from the response
    const outputText =
      data.output_text ||
      data.output
        ?.filter((item: { type: string }) => item.type === "message")
        .flatMap((item: { content: { type: string; text: string }[] }) =>
          item.content
            .filter((c: { type: string }) => c.type === "output_text")
            .map((c: { text: string }) => c.text)
        )
        .join("") ||
      "";

    return NextResponse.json({ response: outputText });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with agent" },
      { status: 500 }
    );
  }
}
