"use client";

import { useState } from "react";
import { ExternalLink, Video, Radio, Sparkles } from "lucide-react";
import NativeLiveClassFrame from "@/components/NativeLiveClassFrame";

type MeetFrameProps = {
  meetUrl?: string;
  title?: string;
  roomCode?: string;
  displayName?: string;
  subject?: string;
  isTeacher?: boolean;
  onLeave?: () => void;
};

/**
 * Universal Video Conferencing Frame.
 * Prefers native in-app WebRTC video class (zero external logins needed).
 * Gracefully accommodates Google Meet URLs with in-app toggle.
 */
export default function MeetFrame({
  meetUrl = "",
  title = "Live Class",
  roomCode = "smartlearn",
  displayName = "Student",
  subject,
  isTeacher = false,
  onLeave,
}: MeetFrameProps) {
  const url = meetUrl.trim();
  const isGoogleMeet = url.includes("meet.google.com");
  const isNative =
    !url ||
    url.includes("meet.jit.si") ||
    url.includes("smartlearn") ||
    !/^https?:\/\//i.test(url);

  // If it's Google Meet, allow switching to Native In-App room
  const [useNativeOverride, setUseNativeOverride] = useState(isNative);

  // Deterministic clean room name
  const nativeRoomName = `smartlearn-${(roomCode || "main").toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  if (useNativeOverride || isNative) {
    return (
      <NativeLiveClassFrame
        roomName={nativeRoomName}
        displayName={displayName}
        title={title}
        subject={subject}
        isTeacher={isTeacher}
        onLeave={onLeave}
      />
    );
  }

  // Google Meet fallback with 1-click switch to In-App Native Class
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center text-white shadow-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
        <Video className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-xs text-slate-400">
        The teacher provided an external Google Meet link for this session.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500"
        >
          <ExternalLink className="h-4 w-4" /> Open External Google Meet
        </a>

        <button
          type="button"
          onClick={() => setUseNativeOverride(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/30 px-5 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/50 hover:text-white"
        >
          <Sparkles className="h-4 w-4" /> Switch to In-App Native Video
        </button>
      </div>

      <p className="mt-4 break-all text-[11px] text-slate-500">{url}</p>
    </div>
  );
}
