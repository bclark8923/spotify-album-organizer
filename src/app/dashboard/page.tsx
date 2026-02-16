"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AlbumGrid from "@/components/AlbumGrid";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import AgentChat from "@/components/AgentChat";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (session.error === "RefreshAccessTokenError") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Your session has expired.</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-green-500 rounded-full text-black font-semibold cursor-pointer"
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#121212]">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <AlbumGrid searchQuery={searchQuery} />
      </main>
      <AgentChat />
      <SpotifyPlayer />
    </div>
  );
}
