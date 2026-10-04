import { NextRequest, NextResponse } from "next/server";

interface SignalPayload {
  from: string;
  to: string;
  type: "offer" | "answer" | "candidate";
  data: any;
  timestamp: number;
}

interface ChatMsg {
  id: string;
  sender: string;
  role: "teacher" | "student";
  text: string;
  time: string;
  timestamp: number;
}

interface RoomState {
  roomCode: string;
  broadcaster: {
    id: string;
    name: string;
    active: boolean;
    isScreenShare: boolean;
    startedAt: number;
    lastSeen: number;
  } | null;
  viewers: Map<string, { id: string; name: string; lastSeen: number; raisedHand: boolean }>;
  signals: SignalPayload[];
  chat: ChatMsg[];
  updatedAt: number;
}

// Global in-memory room store
const roomStore = new Map<string, RoomState>();

function getOrCreateRoom(code: string): RoomState {
  const norm = (code || "main").toLowerCase().trim();
  let room = roomStore.get(norm);
  if (!room) {
    room = {
      roomCode: norm,
      broadcaster: null,
      viewers: new Map(),
      signals: [],
      chat: [],
      updatedAt: Date.now(),
    };
    roomStore.set(norm, room);
  }
  return room;
}

// Periodic cleanup of stale viewers (>60s inactivity)
function cleanupStale(room: RoomState) {
  const now = Date.now();
  if (room.broadcaster && now - room.broadcaster.lastSeen > 90_000) {
    room.broadcaster.active = false;
  }
  for (const [vid, viewer] of room.viewers.entries()) {
    if (now - viewer.lastSeen > 60_000) {
      room.viewers.delete(vid);
    }
  }
  // Keep only signals less than 60 seconds old
  room.signals = room.signals.filter((s) => now - s.timestamp < 60_000);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, roomCode } = body;
    const room = getOrCreateRoom(roomCode);
    cleanupStale(room);

    switch (action) {
      // 1. Teacher starts or heartbeats broadcast
      case "announce-broadcaster": {
        const { teacherId, teacherName, isScreenShare, active } = body;
        room.broadcaster = {
          id: teacherId || "teacher",
          name: teacherName || "Teacher",
          active: active !== false,
          isScreenShare: Boolean(isScreenShare),
          startedAt: room.broadcaster?.startedAt || Date.now(),
          lastSeen: Date.now(),
        };
        room.updatedAt = Date.now();
        return NextResponse.json({
          ok: true,
          broadcaster: room.broadcaster,
          viewerCount: room.viewers.size,
        });
      }

      // 2. Student joins or heartbeats viewer presence
      case "join-viewer": {
        const { studentId, studentName } = body;
        if (studentId) {
          const existing = room.viewers.get(studentId);
          room.viewers.set(studentId, {
            id: studentId,
            name: studentName || "Student",
            lastSeen: Date.now(),
            raisedHand: existing?.raisedHand || false,
          });
        }
        room.updatedAt = Date.now();
        return NextResponse.json({
          ok: true,
          broadcaster: room.broadcaster,
          viewerCount: room.viewers.size,
          chat: room.chat.slice(-40),
        });
      }

      // 3. Send WebRTC signal (offer, answer, candidate)
      case "send-signal": {
        const { from, to, type, data } = body;
        if (from && to && type && data) {
          room.signals.push({
            from,
            to,
            type,
            data,
            timestamp: Date.now(),
          });
        }
        return NextResponse.json({ ok: true });
      }

      // 4. Poll WebRTC signals destined for this peer
      case "poll-signals": {
        const { peerId } = body;
        if (!peerId) return NextResponse.json({ ok: true, signals: [] });

        // Retrieve signals targeted at this peerId
        const forMe = room.signals.filter((s) => s.to === peerId);
        // Remove delivered signals from queue
        room.signals = room.signals.filter((s) => s.to !== peerId);

        // Update last seen
        if (room.broadcaster && room.broadcaster.id === peerId) {
          room.broadcaster.lastSeen = Date.now();
        } else if (room.viewers.has(peerId)) {
          const v = room.viewers.get(peerId)!;
          v.lastSeen = Date.now();
        }

        const raisedHandsList = Array.from(room.viewers.values())
          .filter((v) => v.raisedHand)
          .map((v) => ({ id: v.id, name: v.name }));

        return NextResponse.json({
          ok: true,
          signals: forMe,
          broadcaster: room.broadcaster,
          viewerCount: room.viewers.size,
          raisedHands: raisedHandsList,
        });
      }

      // 5. Send Live Chat Message
      case "send-chat": {
        const { sender, role, text } = body;
        if (text && text.trim()) {
          const msg: ChatMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: sender || "Anonymous",
            role: role === "teacher" ? "teacher" : "student",
            text: String(text).slice(0, 500).trim(),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now(),
          };
          room.chat.push(msg);
          if (room.chat.length > 100) room.chat.shift();
        }
        return NextResponse.json({ ok: true, chat: room.chat.slice(-40) });
      }

      // 6. Raise / Lower Hand
      case "toggle-hand": {
        const { studentId, raised } = body;
        if (studentId && room.viewers.has(studentId)) {
          const v = room.viewers.get(studentId)!;
          v.raisedHand = Boolean(raised);
          v.lastSeen = Date.now();
        }
        return NextResponse.json({ ok: true });
      }

      // 7. Teacher ends live stream
      case "end-stream": {
        if (room.broadcaster) {
          room.broadcaster.active = false;
        }
        room.signals = [];
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json(
          { ok: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "WebRTC signaling error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
