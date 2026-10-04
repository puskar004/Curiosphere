"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Video,
  Volume2,
} from "lucide-react";

type NativeLiveClassProps = {
  roomName: string;
  displayName: string;
  isTeacher?: boolean;
  subject?: string;
  title?: string;
  onLeave?: () => void;
};

export default function NativeLiveClassFrame({
  roomName,
  displayName,
  isTeacher = false,
  subject,
  title,
  onLeave,
}: NativeLiveClassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTheater, setIsTheater] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const frameId = useId();

  // Sanitize room name to be safe for WebRTC room URLs
  const cleanRoom =
    roomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-") || "smartlearn-main";

  // Build Jitsi WebRTC iframe URL with pre-filled display name and no-prejoin config
  const configHash = [
    `userInfo.displayName=${encodeURIComponent(displayName || "Student")}`,
    "config.prejoinPageEnabled=false",
    "config.prejoinConfig.enabled=false",
    "config.disableDeepLinking=true",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "interfaceConfig.SHOW_JITSI_WATERMARK=false",
    "interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false",
  ].join("&");

  const jitsiUrl = `https://meet.jit.si/${cleanRoom}#${configHash}`;

  const copyRoomLink = () => {
    const link = `https://meet.jit.si/${cleanRoom}`;
    void navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTheater = () => {
    setIsTheater((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTheater) {
        setIsTheater(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTheater]);

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-300 ${
        isTheater
          ? "fixed inset-0 z-50 flex flex-col bg-slate-950 p-2 sm:p-4"
          : "w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl"
      }`}
    >
      {/* Top Header / Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-white backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="h-2 w-2 animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
          </span>
          <span className="font-bold text-white">
            {title || (isTeacher ? "Teacher Live Stream" : "Live Class Room")}
          </span>
          {subject && (
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              {subject}
            </span>
          )}
          <span className="hidden items-center gap-1 rounded bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 sm:inline-flex">
            <ShieldCheck className="h-3 w-3" /> Attendance Auto-Marked
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyRoomLink}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            {copied ? "Link Copied!" : "Copy Link"}
          </button>

          <a
            href={jitsiUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white sm:inline-flex"
            title="Open in new window"
          >
            <ExternalLink className="h-3 w-3" /> Pop Out
          </a>

          <button
            type="button"
            onClick={toggleTheater}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-600/40 hover:text-white"
          >
            {isTheater ? (
              <>
                <Minimize2 className="h-3 w-3" /> Normal View
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" /> Theater Mode
              </>
            )}
          </button>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-lg bg-rose-600/80 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-rose-600"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div
        className={`relative w-full bg-slate-950 ${
          isTheater ? "flex-1" : "aspect-video min-h-[420px] sm:min-h-[540px]"
        }`}
      >
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-400">
            <Radio className="h-8 w-8 animate-pulse text-indigo-400" />
            <p className="text-xs font-medium">Connecting to secure in-app video room…</p>
            <p className="text-[11px] text-slate-500">
              Allow Camera and Microphone when prompted.
            </p>
          </div>
        )}

        <iframe
          id={frameId}
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection"
          className="h-full w-full border-0"
          onLoad={() => setIframeLoaded(true)}
          title={title || "In-App Live Video"}
        />
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Logged in as <strong className="text-slate-200">{displayName}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>In-App WebRTC Video</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Screen sharing &amp; chat active inside the window
        </div>
      </div>
    </div>
  );
}
