"use client";

import { useEffect, useRef, useState, useCallback, type MutableRefObject } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Volume2,
  VolumeX,
  MessageSquare,
  Hand,
  Send,
  Users,
  Timer,
  ExternalLink,
  Sparkles,
  Info,
  RefreshCw,
  X,
  Layers,
  Circle,
  CloudUpload,
  CheckCircle2,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NativeLiveClassProps = {
  roomName: string;
  classCode?: string;
  displayName: string;
  isTeacher?: boolean;
  subject?: string;
  title?: string;
  onLeave?: () => void;
  endSignalRef?: MutableRefObject<(() => Promise<void>) | null>;
  onRecordingPublished?: (url: string, title: string) => void;
};

interface ChatMessage {
  id: string;
  sender: string;
  role: "teacher" | "student";
  text: string;
  time: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function NativeLiveClassFrame({
  roomName,
  classCode,
  displayName,
  isTeacher = false,
  subject,
  title,
  onLeave,
  endSignalRef,
  onRecordingPublished,
}: NativeLiveClassProps) {
  // Modes: "native" (In-app unlimited WebRTC) | "standalone" | "iframe"
  const [viewEngine, setViewEngine] = useState<"native" | "iframe">("native");
  const [isTheater, setIsTheater] = useState(false);

  // Clean room identifier
  const cleanRoom =
    roomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-") || "smartlearn-main";

  // Peer ID
  const myPeerId = useRef<string>(
    `${isTeacher ? "teacher" : "student"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  );

  // Video references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Media Streams & Peer Connections
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Media Controls
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  // Stream Status
  const [broadcasterOnline, setBroadcasterOnline] = useState(isTeacher);
  const [viewerCount, setViewerCount] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHandsList, setRaisedHandsList] = useState<{ id: string; name: string }[]>([]);

  // Elapsed Timer (Unlimited)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // In-Class Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Automatic Live Class Recording & Cloudflare R2 Upload (Teacher only)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordDrawTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingStartAtRef = useRef<number>(0);
  const uploadInFlightRef = useRef<Promise<void> | null>(null);

  const [recState, setRecState] = useState<
    "idle" | "recording" | "uploading" | "uploaded" | "fallback" | "error"
  >("idle");
  const [recUploadPct, setRecUploadPct] = useState(0);
  const [recMessage, setRecMessage] = useState<string | null>(null);
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [lastBackupBlobUrl, setLastBackupBlobUrl] = useState<string | null>(null);

  const effectiveClassCode = (classCode || roomName.replace(/^smartlearn-/i, "")).trim().toUpperCase();

  // Check Cloudflare R2 status once for teacher
  useEffect(() => {
    if (!isTeacher) return;
    let active = true;
    fetch("/api/classroom/recording")
      .then((r) => r.json())
      .then((d) => {
        if (active && typeof d.configured === "boolean") {
          setR2Configured(d.configured);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isTeacher]);

  // Connect/swap audio tracks into persistent recording AudioContext
  const connectStreamAudioToRecorder = useCallback((stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) return;
      if (!audioCtxRef.current || !audioDestRef.current) return;
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      const audioOnly = new MediaStream(audioTracks);
      const src = audioCtxRef.current.createMediaStreamSource(audioOnly);
      src.connect(audioDestRef.current);
      audioSourceRef.current = src;
    } catch {
      // ignore audio reconnect glitches
    }
  }, []);

  // Start automatic continuous recording (Canvas + AudioContext so Camera <-> Screen Share stays 1 video)
  const startAutoRecording = useCallback(
    (stream: MediaStream) => {
      if (!isTeacher) return;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        // Already recording — just route the new stream's audio into the active mixer
        connectStreamAudioToRecorder(stream);
        return;
      }
      if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        recordCanvasRef.current = canvas;
        const ctx = canvas.getContext("2d");

        if (recordDrawTimerRef.current) {
          clearInterval(recordDrawTimerRef.current);
        }

        // Draw active video frame (webcam or screen share) at 20 FPS
        recordDrawTimerRef.current = setInterval(() => {
          if (!ctx) return;
          const vid = localVideoRef.current;
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (vid && vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0) {
            const scale = Math.min(
              canvas.width / vid.videoWidth,
              canvas.height / vid.videoHeight
            );
            const dw = vid.videoWidth * scale;
            const dh = vid.videoHeight * scale;
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;
            ctx.drawImage(vid, dx, dy, dw, dh);
          } else {
            ctx.fillStyle = "#94a3b8";
            ctx.font = "bold 28px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
              title || "CurioSphere Live Class",
              canvas.width / 2,
              canvas.height / 2
            );
          }
        }, 50);

        const canvasStream = canvas.captureStream(20);
        const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

        // Persistent AudioContext destination so audio survives camera <-> screen switches
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const dest = audioCtx.createMediaStreamDestination();
          audioCtxRef.current = audioCtx;
          audioDestRef.current = dest;
          connectStreamAudioToRecorder(stream);
          tracks.push(...dest.stream.getAudioTracks());
        } else {
          tracks.push(...stream.getAudioTracks());
        }

        const combined = new MediaStream(tracks);
        const preferredTypes = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ];
        const mimeType =
          preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

        const recorder = new MediaRecorder(
          combined,
          mimeType
            ? {
                mimeType,
                videoBitsPerSecond: 1_000_000,
                audioBitsPerSecond: 96_000,
              }
            : undefined
        );

        recordedChunksRef.current = [];
        recordingStartAtRef.current = Date.now();
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunksRef.current.push(ev.data);
          }
        };

        recorder.start(5000); // flush chunk every 5s
        mediaRecorderRef.current = recorder;
        setRecState("recording");
        setRecMessage(null);
      } catch (err) {
        console.warn("Auto-recording failed to start:", err);
      }
    },
    [isTeacher, title, connectStreamAudioToRecorder]
  );

  const triggerLocalBackupDownload = useCallback(
    (blob: Blob, ext: string) => {
      const url = URL.createObjectURL(blob);
      setLastBackupBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      const a = document.createElement("a");
      const safeName = (title || "live-class")
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();
      a.href = url;
      a.download = `${safeName}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [title]
  );

  // Stop recording and auto-upload directly to Cloudflare R2 + publish to classroom
  const stopAndUploadRecording = useCallback(async () => {
    if (!isTeacher) return;
    if (uploadInFlightRef.current) {
      return uploadInFlightRef.current;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    const work = (async () => {
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - (recordingStartAtRef.current || Date.now())) / 1000)
      );

      // Wait for MediaRecorder to flush final data chunk
      const blob = await new Promise<Blob>((resolve) => {
        const mime = recorder.mimeType || "video/webm";
        recorder.onstop = () => {
          resolve(new Blob(recordedChunksRef.current, { type: mime }));
        };
        try {
          recorder.stop();
        } catch {
          resolve(new Blob(recordedChunksRef.current, { type: mime }));
        }
      });

      // Clean up canvas & audio mixer
      if (recordDrawTimerRef.current) {
        clearInterval(recordDrawTimerRef.current);
        recordDrawTimerRef.current = null;
      }
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.disconnect();
        } catch {
          // ignore
        }
        audioSourceRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          await audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
      mediaRecorderRef.current = null;

      // Ignore empty/tiny accidental recordings (< 4 KB)
      if (!blob || blob.size < 4096) {
        setRecState("idle");
        return;
      }

      const contentType = blob.type.includes("mp4") ? "video/mp4" : "video/webm";
      const ext = contentType === "video/mp4" ? "mp4" : "webm";

      setRecState("uploading");
      setRecUploadPct(5);
      setRecMessage("Preparing Cloudflare R2 upload…");

      try {
        // 1. Get presigned PUT URL from server
        const presignRes = await fetch("/api/classroom/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "presign",
            classCode: effectiveClassCode,
            title: title || "Live Class",
            contentType,
          }),
        });
        const presignData = await presignRes.json();

        if (!presignRes.ok || !presignData.ok || !presignData.uploadUrl) {
          // R2 not configured yet -> save locally so teacher never loses lecture!
          triggerLocalBackupDownload(blob, ext);
          setRecState("fallback");
          setRecMessage(
            presignData.configured === false
              ? "Cloudflare R2 keys not set yet — recording saved locally to your device."
              : presignData.error || "Upload unavailable — saved locally to your device."
          );
          return;
        }

        // 2. Direct browser -> Cloudflare R2 PUT upload with real-time progress
        setRecMessage("Uploading recording to Cloudflare R2…");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignData.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", contentType);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && ev.total > 0) {
              const pct = Math.min(95, Math.max(5, Math.round((ev.loaded / ev.total) * 95)));
              setRecUploadPct(pct);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setRecUploadPct(98);
              resolve();
            } else {
              reject(new Error(`Cloudflare R2 upload failed (${xhr.status})`));
            }
          };
          xhr.onerror = () =>
            reject(
              new Error(
                "Cloudflare R2 upload blocked (check R2 bucket CORS policy allows PUT from this domain)."
              )
            );
          xhr.send(blob);
        });

        // 3. Publish uploaded video URL to Classroom Materials so students can watch
        setRecMessage("Publishing video to classroom…");
        const pubRes = await fetch("/api/classroom/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "publish",
            classCode: effectiveClassCode,
            title: title || "Live Class",
            subject: subject || "Live Recording",
            publicUrl: presignData.publicUrl,
            durationSec,
          }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok || !pubData.ok) {
          throw new Error(pubData.error || "Uploaded to R2 but failed to publish to class.");
        }

        setRecUploadPct(100);
        setRecState("uploaded");
        setRecMessage("Uploaded to Cloudflare R2 & published to students!");
        onRecordingPublished?.(
          presignData.publicUrl,
          pubData.material?.title || title || "Live Class Recording"
        );
      } catch (err) {
        // Safety fallback: download locally so lecture is never lost
        triggerLocalBackupDownload(blob, ext);
        setRecState("error");
        setRecMessage(
          `${err instanceof Error ? err.message : "Upload failed"} — Backup saved to your device.`
        );
      }
    })();

    uploadInFlightRef.current = work;
    try {
      await work;
    } finally {
      uploadInFlightRef.current = null;
    }
  }, [
    isTeacher,
    effectiveClassCode,
    title,
    subject,
    onRecordingPublished,
    triggerLocalBackupDownload,
  ]);

  // Register stopAndUploadRecording with parent Teacher Hub ("End session" button)
  useEffect(() => {
    if (!endSignalRef) return;
    endSignalRef.current = stopAndUploadRecording;
    return () => {
      endSignalRef.current = null;
    };
  }, [endSignalRef, stopAndUploadRecording]);

  // Warn teacher before closing browser tab while recording or uploading
  useEffect(() => {
    if (!isTeacher) return;
    if (recState !== "recording" && recState !== "uploading") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Live class recording is active/uploading. Click 'End session' so the video uploads automatically.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isTeacher, recState]);

  // Jitsi URL for external window (unlimited when opened outside iframe)
  const jitsiDirectUrl = `https://meet.jit.si/${cleanRoom}#userInfo.displayName=${encodeURIComponent(
    displayName || "Student"
  )}&config.prejoinPageEnabled=false`;

  // Start Elapsed Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // TEACHER: START WEBCAM & MIC
  // -------------------------------------------------------------
  const startCameraAndMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);
      setIsScreenSharing(false);
      setBroadcasterOnline(true);
      // Automatically start recording teacher's live class
      startAutoRecording(stream);

      // Announce broadcaster to signaling server
      void fetch("/api/classroom/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce-broadcaster",
          roomCode: cleanRoom,
          teacherId: myPeerId.current,
          teacherName: displayName,
          isScreenShare: false,
          active: true,
        }),
      });
    } catch {
      // User cancelled camera permission or device busy
    }
  }, [cleanRoom, displayName, startAutoRecording]);

  // -------------------------------------------------------------
  // TEACHER: TOGGLE SCREEN SHARE
  // -------------------------------------------------------------
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Switch back to camera
      await startCameraAndMic();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Handle user clicking "Stop Sharing" on browser banner
      screenStream.getVideoTracks()[0].onended = () => {
        void startCameraAndMic();
      };

      // Keep microphone audio track if present
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0 && screenStream.getAudioTracks().length === 0) {
          screenStream.addTrack(audioTracks[0]);
        }
      }

      localStreamRef.current = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      setIsScreenSharing(true);
      setCameraActive(true);
      // Keep recording seamlessly across camera <-> screen share
      startAutoRecording(screenStream);

      // Announce screen share state
      void fetch("/api/classroom/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce-broadcaster",
          roomCode: cleanRoom,
          teacherId: myPeerId.current,
          teacherName: displayName,
          isScreenShare: true,
          active: true,
        }),
      });
    } catch {
      // Cancelled screen share dialog
    }
  }, [isScreenSharing, startCameraAndMic, cleanRoom, displayName, startAutoRecording]);

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setCameraActive(vTrack.enabled);
      }
    } else if (isTeacher) {
      void startCameraAndMic();
    }
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setMicActive(aTrack.enabled);
      }
    }
  };

  // Auto-start teacher stream when in native mode
  useEffect(() => {
    if (isTeacher && viewEngine === "native") {
      void startCameraAndMic();
    }
    return () => {
      if (recordDrawTimerRef.current) {
        clearInterval(recordDrawTimerRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isTeacher, viewEngine, startCameraAndMic]);

  // -------------------------------------------------------------
  // STUDENT: SETUP WEBRTC RECEIVER
  // -------------------------------------------------------------
  const setupStudentPeerConnection = useCallback((teacherId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(teacherId, pc);

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void fetch("/api/classroom/webrtc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send-signal",
            roomCode: cleanRoom,
            from: myPeerId.current,
            to: teacherId,
            type: "candidate",
            data: event.candidate,
          }),
        });
      }
    };

    return pc;
  }, [cleanRoom]);

  // -------------------------------------------------------------
  // SIGNALING HEARTBEAT & EVENT POLLING
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewEngine !== "native") return;

    let mounted = true;
    const pollInterval = setInterval(async () => {
      if (!mounted) return;

      try {
        if (!isTeacher) {
          // Student heartbeat
          const joinRes = await fetch("/api/classroom/webrtc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join-viewer",
              roomCode: cleanRoom,
              studentId: myPeerId.current,
              studentName: displayName,
            }),
          });
          const joinData = await joinRes.json();
          if (joinData.ok) {
            setBroadcasterOnline(Boolean(joinData.broadcaster?.active));
            setViewerCount(joinData.viewerCount || 1);
            if (joinData.chat) setChatMessages(joinData.chat);
          }
        }

        // Poll pending signals targeted at me
        const sigRes = await fetch("/api/classroom/webrtc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll-signals",
            roomCode: cleanRoom,
            peerId: myPeerId.current,
          }),
        });
        const sigData = await sigRes.json();

        if (sigData.ok) {
          if (sigData.viewerCount !== undefined) setViewerCount(sigData.viewerCount);
          if (sigData.raisedHands) setRaisedHandsList(sigData.raisedHands);

          // Handle incoming WebRTC signals
          if (Array.isArray(sigData.signals)) {
            for (const sig of sigData.signals) {
              if (isTeacher) {
                // Teacher handles incoming viewer offer
                if (sig.type === "offer") {
                  let pc = peerConnections.current.get(sig.from);
                  if (!pc) {
                    pc = new RTCPeerConnection(ICE_SERVERS);
                    peerConnections.current.set(sig.from, pc);

                    if (localStreamRef.current) {
                      localStreamRef.current.getTracks().forEach((track) => {
                        pc?.addTrack(track, localStreamRef.current!);
                      });
                    }

                    pc.onicecandidate = (e) => {
                      if (e.candidate) {
                        void fetch("/api/classroom/webrtc", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "send-signal",
                            roomCode: cleanRoom,
                            from: myPeerId.current,
                            to: sig.from,
                            type: "candidate",
                            data: e.candidate,
                          }),
                        });
                      }
                    };
                  }

                  await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  void fetch("/api/classroom/webrtc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "send-signal",
                      roomCode: cleanRoom,
                      from: myPeerId.current,
                      to: sig.from,
                      type: "answer",
                      data: answer,
                    }),
                  });
                } else if (sig.type === "candidate") {
                  const pc = peerConnections.current.get(sig.from);
                  if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(sig.data));
                  }
                }
              } else {
                // Student handles incoming teacher answer
                if (sig.type === "answer") {
                  const pc = peerConnections.current.get(sig.from);
                  if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                  }
                } else if (sig.type === "candidate") {
                  const pc = peerConnections.current.get(sig.from);
                  if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(sig.data));
                  }
                }
              }
            }
          }

          // If student sees broadcaster and hasn't sent offer yet
          if (!isTeacher && sigData.broadcaster?.active) {
            const teacherId = sigData.broadcaster.id;
            let pc = peerConnections.current.get(teacherId);
            if (!pc) {
              pc = setupStudentPeerConnection(teacherId);
              pc.addTransceiver("video", { direction: "recvonly" });
              pc.addTransceiver("audio", { direction: "recvonly" });

              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              void fetch("/api/classroom/webrtc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send-signal",
                  roomCode: cleanRoom,
                  from: myPeerId.current,
                  to: teacherId,
                  type: "offer",
                  data: offer,
                }),
              });
            }
          }
        }
      } catch {
        // network polling hiccup
      }
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [viewEngine, isTeacher, cleanRoom, displayName, setupStudentPeerConnection]);

  // Send Chat message
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");

    try {
      const res = await fetch("/api/classroom/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-chat",
          roomCode: cleanRoom,
          sender: displayName,
          role: isTeacher ? "teacher" : "student",
          text,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.chat)) {
        setChatMessages(data.chat);
      }
    } catch {
      // ignore
    }
  };

  // Toggle Raise Hand
  const toggleRaiseHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    try {
      await fetch("/api/classroom/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-hand",
          roomCode: cleanRoom,
          studentId: myPeerId.current,
          raised: next,
        }),
      });
    } catch {
      // ignore
    }
  };

  // Open Standalone Jitsi Window (Guaranteed Unlimited Duration, No Iframe Restriction)
  const openStandaloneWindow = () => {
    window.open(jitsiDirectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-300 rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl overflow-hidden",
        isTheater ? "fixed inset-0 z-50 rounded-none border-none flex flex-col p-2" : "w-full"
      )}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER BAR                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 backdrop-blur text-xs z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 items-center justify-center">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
          </span>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">
              {title || (isTeacher ? "Teacher Live Studio" : "Live Classroom")}
            </span>
            {subject && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                {subject}
              </span>
            )}
          </div>

          {/* Unlimited Duration Pill */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            <Timer className="h-3 w-3 text-emerald-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
            <span className="text-[10px] text-emerald-400/80 uppercase font-mono">· Unlimited</span>
          </span>

          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
            <ShieldCheck className="h-3 w-3 text-indigo-400" />
            <span>Attendance Auto-Recorded</span>
          </span>

          {/* Auto-Recording Status Pill (Teacher) */}
          {isTeacher && recState === "recording" && (
            <span
              title="Class automatically recording — uploads to Cloudflare R2 when you click End session"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/90 border border-rose-500/50 px-2.5 py-0.5 text-[11px] font-bold text-rose-300"
            >
              <Circle className="h-2.5 w-2.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span>AUTO REC</span>
              <span className="hidden lg:inline text-[10px] text-rose-300/80">
                · {r2Configured === false ? "Local Backup" : "Cloudflare R2"}
              </span>
            </span>
          )}
          {isTeacher && recState === "uploading" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/90 border border-amber-500/50 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Uploading to R2… {recUploadPct}%</span>
            </span>
          )}
          {isTeacher && recState === "uploaded" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Recording Published</span>
            </span>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Active View Engine Selector */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 text-[11px]">
            <button
              type="button"
              onClick={() => setViewEngine("native")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1",
                viewEngine === "native"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Runs inside app with 100% unlimited time (Zero 5-min timeout)"
            >
              <Sparkles className="h-3 w-3" />
              <span>In-App (Unlimited)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewEngine("iframe")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1",
                viewEngine === "iframe"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Embedded frame view"
            >
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">Frame</span>
            </button>
          </div>

          {/* Standalone Window Button (Never times out) */}
          <button
            type="button"
            onClick={openStandaloneWindow}
            title="Open Jitsi in a fresh standalone browser window (Guaranteed unlimited time, no 5-min iframe restriction)"
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/40 hover:text-white transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pop Out (Unlimited)</span>
          </button>

          {/* Toggle In-Class Chat */}
          <button
            type="button"
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              "rounded-xl border p-1.5 text-xs font-semibold transition flex items-center gap-1",
              chatOpen
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
            title="Toggle Live Chat & Doubts"
          >
            <MessageSquare className="h-4 w-4" />
            {chatMessages.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1 text-[10px] text-white">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* Theater Mode */}
          <button
            type="button"
            onClick={() => setIsTheater(!isTheater)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title={isTheater ? "Exit Theater Mode" : "Theater Mode"}
          >
            {isTheater ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN VIDEO & INTERACTION CANVAS                            */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* VIDEO DISPLAY AREA */}
        <div
          className={cn(
            "relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden",
            isTheater ? "min-h-[500px]" : "aspect-video min-h-[440px] sm:min-h-[540px]"
          )}
        >
          {viewEngine === "native" ? (
            /* ================= NATIVE WEBRTC STUDIO ================= */
            <div className="relative h-full w-full flex items-center justify-center bg-slate-950">
              {isTeacher ? (
                /* TEACHER VIEW: Local video or screen share */
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-contain bg-black"
                />
              ) : (
                /* STUDENT VIEW: Remote teacher video */
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={audioMuted}
                  className="h-full w-full object-contain bg-black"
                />
              )}

              {/* Waiting Overlay if Teacher is offline (for student) */}
              {!isTeacher && !broadcasterOnline && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-center p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600/20 text-indigo-400">
                    <Radio className="h-8 w-8 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Waiting for Teacher to broadcast video stream...
                  </h3>
                  <p className="max-w-md text-xs text-slate-400 leading-relaxed">
                    Your attendance is already marked present! As soon as the teacher turns on their
                    camera or screen share, the live lecture will appear here automatically with zero time limit.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openStandaloneWindow}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition"
                    >
                      <ExternalLink className="h-4 w-4" /> Open Full Window (Unlimited)
                    </button>
                  </div>
                </div>
              )}

              {/* Raised Hand Banner Notification (for teacher) */}
              {isTeacher && raisedHandsList.length > 0 && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-2xl bg-amber-500/90 backdrop-blur px-3.5 py-2 text-xs font-bold text-black shadow-lg animate-bounce">
                  <Hand className="h-4 w-4" />
                  <span>
                    {raisedHandsList.map((h) => h.name).join(", ")} raised hand with a question!
                  </span>
                </div>
              )}

              {/* Upload Progress / Recording Status Banner Overlay (Teacher) */}
              {isTeacher &&
                (recState === "uploading" ||
                  recState === "uploaded" ||
                  recState === "fallback" ||
                  recState === "error") && (
                  <div className="absolute bottom-4 left-4 right-4 z-30 mx-auto max-w-lg rounded-2xl border border-white/15 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold">
                        {recState === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        )}
                        {recState === "uploaded" && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        )}
                        {(recState === "fallback" || recState === "error") && (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        )}
                        <span>{recMessage || "Processing live recording…"}</span>
                      </div>
                      {recState === "uploading" && (
                        <span className="font-mono text-amber-300">{recUploadPct}%</span>
                      )}
                      {recState !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => setRecState("idle")}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {recState === "uploading" && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${recUploadPct}%` }}
                        />
                      </div>
                    )}
                    {lastBackupBlobUrl && (recState === "fallback" || recState === "error") && (
                      <div className="mt-2 flex items-center justify-end">
                        <a
                          href={lastBackupBlobUrl}
                          download="live-class-recording.webm"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-slate-700"
                        >
                          <Download className="h-3 w-3" /> Download Backup Again
                        </a>
                      </div>
                    )}
                  </div>
                )}

              {/* Live Status Overlay Chip */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/10 font-mono">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {isScreenSharing
                    ? "Screen Share"
                    : isTeacher
                    ? "Camera Broadcast"
                    : "Live Lecture"}
                </span>
                <span className="text-slate-400">|</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Users className="h-3 w-3 text-indigo-400" />
                  {viewerCount} online
                </span>
              </div>
            </div>
          ) : (
            /* ================= IFRAME VIEW (LEGACY) ================= */
            <div className="relative h-full w-full">
              <iframe
                src={`https://meet.jit.si/${cleanRoom}#userInfo.displayName=${encodeURIComponent(
                  displayName || "Student"
                )}&config.prejoinPageEnabled=false&config.disableDeepLinking=true`}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                className="h-full w-full border-0"
                title={title || "Live Stream"}
              />
              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-amber-950/80 border border-amber-700/60 px-2.5 py-1 text-[11px] text-amber-300 backdrop-blur">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Notice: Embedded iframe may have a 5-min server policy. Use <strong>In-App</strong> or <strong>Pop Out</strong> for unlimited hours.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. COLLAPSIBLE IN-CLASS CHAT & DOUBTS SIDEBAR                 */}
        {/* ------------------------------------------------------------- */}
        {chatOpen && (
          <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col justify-between text-xs z-20">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span>In-Class Doubts &amp; Chat</span>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4 space-y-1">
                  <MessageSquare className="h-8 w-8 text-slate-700" />
                  <p className="font-semibold text-slate-400">No doubts posted yet</p>
                  <p className="text-[11px]">Type a question below to ask your teacher in real time.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-xl p-2.5 leading-relaxed space-y-0.5",
                      msg.role === "teacher"
                        ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-100"
                        : "bg-slate-800/80 border border-slate-700/60 text-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1">
                        {msg.sender}
                        {msg.role === "teacher" && (
                          <span className="rounded bg-indigo-500 px-1 text-[9px] text-white">
                            Teacher
                          </span>
                        )}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-xs">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-800 p-3 bg-slate-950 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Ask teacher a question..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 p-2 text-white disabled:opacity-40 transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. BOTTOM INTERACTIVE CONTROLS BAR                            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-300">
        {/* Left: User metadata & volume */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              Connected as <strong className="text-white">{displayName}</strong>
            </span>
          </div>

          {!isTeacher && (
            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white"
            >
              {audioMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" /> Unmute Audio
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Audio Active
                </>
              )}
            </button>
          )}
        </div>

        {/* Center: Live Action Controls */}
        <div className="flex items-center gap-2">
          {isTeacher ? (
            /* TEACHER BROADCAST CONTROLS */
            <>
              <button
                type="button"
                onClick={toggleCamera}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  cameraActive
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "bg-rose-600 text-white hover:bg-rose-500"
                )}
              >
                {cameraActive ? <Camera className="h-4 w-4 text-emerald-400" /> : <CameraOff className="h-4 w-4" />}
                <span>{cameraActive ? "Camera On" : "Camera Off"}</span>
              </button>

              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  micActive
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "bg-rose-600 text-white hover:bg-rose-500"
                )}
              >
                {micActive ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4" />}
                <span>{micActive ? "Mic Live" : "Mic Muted"}</span>
              </button>

              <button
                type="button"
                onClick={toggleScreenShare}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  isScreenSharing
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                )}
              >
                {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                <span>{isScreenSharing ? "Stop Screen Share" : "Share Screen"}</span>
              </button>

              {recState === "recording" && (
                <button
                  type="button"
                  onClick={() => void stopAndUploadRecording()}
                  title="Stop recording early and upload to Cloudflare R2 right now"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
                >
                  <CloudUpload className="h-4 w-4" />
                  <span className="hidden sm:inline">Save &amp; Upload Now</span>
                </button>
              )}
            </>
          ) : (
            /* STUDENT CONTROLS */
            <>
              <button
                type="button"
                onClick={toggleRaiseHand}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                  handRaised
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30 animate-pulse"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                <Hand className="h-4 w-4" />
                <span>{handRaised ? "Hand Raised ✋" : "Raise Hand ✋"}</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Technical Guarantee Pill */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 font-mono text-emerald-300">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" /> Unlimited Class Duration
          </span>
        </div>
      </div>
    </div>
  );
}
