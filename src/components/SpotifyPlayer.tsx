"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import DevicePicker from "./DevicePicker";
import { SpotifyDevice } from "@/types";

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (data: unknown) => void) => void;
  removeListener: (event: string) => void;
  getCurrentState: () => Promise<PlaybackState | null>;
  setName: (name: string) => void;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
}

interface PlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      name: string;
      artists: { name: string }[];
      album: {
        name: string;
        images: { url: string }[];
      };
    };
  };
}

export default function SpotifyPlayerComponent() {
  const { data: session } = useSession();
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [showDevices, setShowDevices] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [position, setPosition] = useState(0);
  const [isPremiumError, setIsPremiumError] = useState(false);
  const positionInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        const active = data.devices?.find((d: SpotifyDevice) => d.is_active);
        if (active) setActiveDeviceId(active.id);
      }
    } catch {
      // ignore
    }
  }, [session?.accessToken]);

  const fetchPlaybackState = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok && res.status !== 204) {
        const data = await res.json();
        if (data?.item) {
          setPlaybackState({
            paused: !data.is_playing,
            position: data.progress_ms || 0,
            duration: data.item.duration_ms || 0,
            track_window: {
              current_track: {
                name: data.item.name,
                artists: data.item.artists,
                album: {
                  name: data.item.album?.name || "",
                  images: data.item.album?.images || [],
                },
              },
            },
          });
          setPosition(data.progress_ms || 0);
          if (data.device) {
            setActiveDeviceId(data.device.id);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [session?.accessToken]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!session?.accessToken) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Album Organizer",
        getOAuthToken: (cb) => cb(session.accessToken),
        volume: 0.5,
      });

      spotifyPlayer.addListener("ready", (data: unknown) => {
        const { device_id } = data as { device_id: string };
        setDeviceId(device_id);
        setActiveDeviceId(device_id);
        fetchDevices();
      });

      spotifyPlayer.addListener("not_ready", () => {
        setDeviceId(null);
      });

      spotifyPlayer.addListener("player_state_changed", (state: unknown) => {
        const playState = state as PlaybackState | null;
        if (playState) {
          setPlaybackState(playState);
          setPosition(playState.position);
        }
      });

      spotifyPlayer.addListener("authentication_error", () => {
        setIsPremiumError(true);
      });

      spotifyPlayer.addListener("account_error", () => {
        setIsPremiumError(true);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    document.body.appendChild(script);

    return () => {
      if (player) {
        player.disconnect();
      }
      script.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  // Fetch playback state periodically as a fallback — the SDK's
  // player_state_changed listener handles real-time updates when active
  useEffect(() => {
    if (isPremiumError || !session?.accessToken) return;
    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 30000);
    return () => clearInterval(interval);
  }, [isPremiumError, session?.accessToken, fetchPlaybackState]);

  // Track position progress
  useEffect(() => {
    if (positionInterval.current) clearInterval(positionInterval.current);
    if (playbackState && !playbackState.paused) {
      positionInterval.current = setInterval(() => {
        setPosition((prev) => Math.min(prev + 1000, playbackState.duration));
      }, 1000);
    }
    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
    };
  }, [playbackState]);

  const handlePlayPause = async () => {
    if (player && deviceId === activeDeviceId) {
      await player.togglePlay();
    } else if (session?.accessToken) {
      const endpoint = playbackState?.paused ? "play" : "pause";
      await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      await fetchPlaybackState();
    }
  };

  const handlePrev = async () => {
    if (player && deviceId === activeDeviceId) {
      await player.previousTrack();
    } else if (session?.accessToken) {
      await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setTimeout(fetchPlaybackState, 300);
    }
  };

  const handleNext = async () => {
    if (player && deviceId === activeDeviceId) {
      await player.nextTrack();
    } else if (session?.accessToken) {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setTimeout(fetchPlaybackState, 300);
    }
  };

  const handleSeek = async (ms: number) => {
    if (player && deviceId === activeDeviceId) {
      await player.seek(ms);
    } else if (session?.accessToken) {
      await fetch(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${ms}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
    }
    setPosition(ms);
  };

  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    if (player && deviceId === activeDeviceId) {
      await player.setVolume(val);
    } else if (session?.accessToken) {
      await fetch(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(
          val * 100
        )}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
    }
  };

  const handleSelectDevice = async (selectedDeviceId: string) => {
    if (!session?.accessToken) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device_ids: [selectedDeviceId], play: true }),
      });
      setActiveDeviceId(selectedDeviceId);
      setShowDevices(false);
      setTimeout(fetchPlaybackState, 500);
    } catch {
      // ignore
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const track = playbackState?.track_window?.current_track;

  if (!track && !isPremiumError) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <p className="text-sm text-zinc-500">
            {deviceId
              ? "No track playing - click play on an album to start"
              : "Connecting to Spotify..."}
          </p>
          <DevicePicker
            devices={devices}
            activeDeviceId={activeDeviceId}
            onSelectDevice={handleSelectDevice}
            onRefresh={fetchDevices}
            isOpen={showDevices}
            onToggle={() => {
              setShowDevices(!showDevices);
              if (!showDevices) fetchDevices();
            }}
          />
        </div>
      </div>
    );
  }

  if (isPremiumError) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3">
        <p className="text-sm text-zinc-500 text-center">
          Spotify Premium is required for in-app playback. Albums will open in Spotify instead.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-2 z-40">
      <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
        {/* Track info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          {track?.album.images[0]?.url && (
            <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
              <Image
                src={track.album.images[0].url}
                alt={track.album.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{track?.name}</p>
            <p className="text-xs text-zinc-400 truncate">
              {track?.artists.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button onClick={handlePrev} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
            >
              {playbackState?.paused ? (
                <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              )}
            </button>
            <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-xs text-zinc-500 w-10 text-right">
              {formatTime(position)}
            </span>
            <input
              type="range"
              min={0}
              max={playbackState?.duration || 0}
              value={position}
              onChange={(e) => handleSeek(parseInt(e.target.value))}
              className="flex-1 h-1 appearance-none bg-zinc-700 rounded-full cursor-pointer accent-white
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs text-zinc-500 w-10">
              {formatTime(playbackState?.duration || 0)}
            </span>
          </div>
        </div>

        {/* Volume + Devices */}
        <div className="flex items-center gap-2 w-48 justify-end">
          <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 appearance-none bg-zinc-700 rounded-full cursor-pointer accent-white
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <DevicePicker
            devices={devices}
            activeDeviceId={activeDeviceId}
            onSelectDevice={handleSelectDevice}
            onRefresh={fetchDevices}
            isOpen={showDevices}
            onToggle={() => {
              setShowDevices(!showDevices);
              if (!showDevices) fetchDevices();
            }}
          />
        </div>
      </div>
    </div>
  );
}
