"use client";

import { SpotifyDevice } from "@/types";

interface DevicePickerProps {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DevicePicker({
  devices,
  activeDeviceId,
  onSelectDevice,
  onRefresh,
  isOpen,
  onToggle,
}: DevicePickerProps) {
  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "computer":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case "smartphone":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case "speaker":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Select device"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
            <h3 className="text-sm font-semibold text-white">Connect to a device</h3>
            <button
              onClick={onRefresh}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh devices"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500">
                <p>No devices found</p>
                <p className="text-xs mt-1">Open Spotify on a device to see it here</p>
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors cursor-pointer ${
                    device.id === activeDeviceId ? "bg-zinc-700/50" : ""
                  }`}
                >
                  <span
                    className={
                      device.id === activeDeviceId
                        ? "text-green-400"
                        : "text-zinc-400"
                    }
                  >
                    {getDeviceIcon(device.type)}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${
                        device.id === activeDeviceId
                          ? "text-green-400 font-medium"
                          : "text-white"
                      }`}
                    >
                      {device.name}
                    </p>
                    <p className="text-xs text-zinc-500">{device.type}</p>
                  </div>
                  {device.id === activeDeviceId && (
                    <svg className="w-4 h-4 text-green-400 ml-auto shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
