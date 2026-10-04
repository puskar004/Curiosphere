/**
 * Concurrent-safe attendance journal for live class.
 * Ensures 30–100 students marking attendance at once never overwrite each other.
 * Integrates directly with Supabase Postgres + sequential local mutex.
 */
import { promises as fs } from "fs";
import path from "path";
import type { AttendanceAttendee } from "@/lib/classroom-types";
import { uploadBufferRemote } from "@/lib/remote-upload";
import {
  dbGetLiveAttendance,
  dbStampAttendanceLeft,
  dbUpsertLiveAttendance,
} from "@/lib/supabase-db";

export type SessionAtt = {
  sessionId: string;
  attendees: AttendanceAttendee[];
  updatedAt: number;
};

type Journal = {
  code: string;
  sessions: Record<string, SessionAtt>;
  remoteUrl?: string;
  updatedAt: number;
};

// Memory cache of journals
const mem = new Map<string, Journal>();

// Sequential execution queue per class code to prevent concurrent write races
const queueMap = new Map<string, Promise<unknown>>();

function runInQueue<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const c = code.toUpperCase();
  const prev = queueMap.get(c) || Promise.resolve();
  const next = prev.then(fn, fn); // run regardless of previous rejection
  queueMap.set(c, next);
  return next as Promise<T>;
}

function dir() {
  return process.env.VERCEL
    ? "/tmp/smartlearn-attendance"
    : path.join(process.cwd(), ".data", "attendance");
}

function localPath(code: string) {
  return path.join(dir(), `${code.toUpperCase()}.json`);
}

function pointerPath(code: string) {
  return localPath(code) + ".remote";
}

export function mergeAtt(
  ...lists: (AttendanceAttendee[] | undefined)[]
): AttendanceAttendee[] {
  const map = new Map<string, AttendanceAttendee>();
  for (const list of lists) {
    for (const a of list || []) {
      if (!a?.studentId) continue;
      const id = String(a.studentId);
      const prev = map.get(id);
      if (!prev) {
        map.set(id, {
          studentId: id,
          name: String(a.name || "Student").slice(0, 80),
          joinedAt: Number(a.joinedAt) || Date.now(),
          leftAt: a.leftAt ? Number(a.leftAt) : undefined,
        });
      } else {
        map.set(id, {
          studentId: id,
          name:
            a.name && a.name !== "Student"
              ? String(a.name).slice(0, 80)
              : prev.name,
          joinedAt: Math.min(
            Number(prev.joinedAt) || Date.now(),
            Number(a.joinedAt) || Date.now()
          ),
          leftAt: a.leftAt || prev.leftAt,
        });
      }
    }
  }
  return Array.from(map.values()).slice(0, 300);
}

async function readLocal(code: string): Promise<Journal | null> {
  try {
    const raw = await fs.readFile(localPath(code), "utf8");
    const j = JSON.parse(raw) as Journal;
    if (j?.sessions) return j;
  } catch {
    // ignore
  }
  return null;
}

async function readRemote(url: string): Promise<Journal | null> {
  try {
    const res = await fetch(
      url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(),
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as Journal;
    if (j?.sessions) return j;
  } catch {
    // ignore
  }
  return null;
}

async function load(code: string): Promise<Journal> {
  const c = code.toUpperCase();
  let remote: Journal | null = null;
  try {
    const ptr = (await fs.readFile(pointerPath(c), "utf8")).trim();
    if (ptr.startsWith("http")) remote = await readRemote(ptr);
  } catch {
    // ignore
  }
  const local = (await readLocal(c)) || mem.get(c) || null;
  const memJ = mem.get(c);

  const sessions: Record<string, SessionAtt> = {
    ...(remote?.sessions || {}),
    ...(local?.sessions || {}),
    ...(memJ?.sessions || {}),
  };

  const allIds = new Set([
    ...Object.keys(remote?.sessions || {}),
    ...Object.keys(local?.sessions || {}),
    ...Object.keys(memJ?.sessions || {}),
  ]);

  for (const sid of allIds) {
    sessions[sid] = {
      sessionId: sid,
      attendees: mergeAtt(
        remote?.sessions?.[sid]?.attendees,
        local?.sessions?.[sid]?.attendees,
        memJ?.sessions?.[sid]?.attendees
      ),
      updatedAt: Math.max(
        remote?.sessions?.[sid]?.updatedAt || 0,
        local?.sessions?.[sid]?.updatedAt || 0,
        memJ?.sessions?.[sid]?.updatedAt || 0,
        Date.now()
      ),
    };
  }

  const j: Journal = {
    code: c,
    sessions,
    updatedAt: Date.now(),
    remoteUrl: remote?.remoteUrl || local?.remoteUrl || memJ?.remoteUrl,
  };
  mem.set(c, j);
  return j;
}

const remoteSyncTimers = new Map<string, NodeJS.Timeout>();

function scheduleRemoteSync(c: string, j: Journal) {
  const existing = remoteSyncTimers.get(c);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    remoteSyncTimers.delete(c);
    try {
      const remote = await uploadBufferRemote(
        Buffer.from(JSON.stringify(j), "utf8"),
        `att-${c}-${Date.now()}.json`,
        "application/json"
      );
      if (remote) {
        j.remoteUrl = remote;
        mem.set(c, j);
        await fs.writeFile(pointerPath(c), remote, "utf8");
        await fs.writeFile(localPath(c), JSON.stringify(j), "utf8");
      }
    } catch (e) {
      console.error("attendance journal remote", e);
    }
  }, 2500);
  remoteSyncTimers.set(c, timer);
}

async function persist(j: Journal) {
  const c = j.code.toUpperCase();
  j.code = c;
  j.updatedAt = Date.now();
  mem.set(c, j);

  try {
    await fs.mkdir(dir(), { recursive: true });
    await fs.writeFile(localPath(c), JSON.stringify(j), "utf8");
  } catch (e) {
    console.error("attendance journal local", e);
  }

  scheduleRemoteSync(c, j);
}

/**
 * Concurrent-safe mark attendance.
 * Queues concurrent calls per class code so 30 students all get recorded without overwriting.
 * Also persists atomically to Supabase.
 */
export async function journalMarkAttendance(
  code: string,
  sessionId: string,
  attendee: AttendanceAttendee
): Promise<AttendanceAttendee[]> {
  const c = code.toUpperCase();
  const sid = sessionId || "unknown";

  // 1. Fire-and-forget / parallel atomic write to Supabase
  void dbUpsertLiveAttendance(c, sid, attendee);

  // 2. Linearized update in local journal mutex
  return runInQueue(c, async () => {
    const j = await load(c);
    const prev = j.sessions[sid]?.attendees || [];
    const attendees = mergeAtt(prev, [attendee]);
    j.sessions[sid] = {
      sessionId: sid,
      attendees,
      updatedAt: Date.now(),
    };
    await persist(j);
    return attendees;
  });
}

/**
 * List real-time attendance for a session.
 * Merges Supabase Postgres records + local journal records.
 */
export async function journalListAttendance(
  code: string,
  sessionId: string
): Promise<AttendanceAttendee[]> {
  const c = code.toUpperCase();
  const sid = sessionId || "unknown";

  // Pull Supabase records
  const dbAttendees = await dbGetLiveAttendance(c, sid);

  // Pull local/memory journal
  const j = await load(c);
  const localAttendees = j.sessions[sid]?.attendees || [];

  return mergeAtt(dbAttendees, localAttendees);
}

/**
 * Mark student as having left the session.
 */
export async function journalStampLeft(
  code: string,
  sessionId: string,
  studentId: string
): Promise<AttendanceAttendee[]> {
  const c = code.toUpperCase();
  const sid = sessionId || "unknown";
  const now = Date.now();

  void dbStampAttendanceLeft(c, sid, studentId);

  return runInQueue(c, async () => {
    const j = await load(c);
    const prev = j.sessions[sid]?.attendees || [];
    const attendees = prev.map((a) =>
      a.studentId === studentId && !a.leftAt ? { ...a, leftAt: now } : a
    );
    if (!attendees.some((a) => a.studentId === studentId)) {
      attendees.push({
        studentId,
        name: "Student",
        joinedAt: now,
        leftAt: now,
      });
    }
    j.sessions[sid] = { sessionId: sid, attendees, updatedAt: now };
    await persist(j);
    return attendees;
  });
}
