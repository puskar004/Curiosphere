import { promises as fs } from "fs";
import path from "path";
import { findClassroomByCode, getTeacherMeta } from "@/lib/classroom-server";
import type { Classroom } from "@/lib/classroom-types";

export type RoomMsg = {
  id: string;
  classCode: string;
  className?: string;
  author: string;
  authorId: string;
  role: "teacher" | "student";
  text: string;
  imageDataUrl?: string;
  replyToId?: string;
  replyToAuthor?: string;
  replyToText?: string;
  at: number;
};

/** Keep common-room posts for 7 days */
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getStoreDir(): string {
  const base = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data");
  return path.join(base, "common-rooms");
}

function getFilePath(classCode: string): string {
  const safe = classCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return path.join(getStoreDir(), `cr-${safe}.json`);
}

function isFresh(m: RoomMsg): boolean {
  return Date.now() - (m.at || 0) < ROOM_TTL_MS;
}

async function readFileStore(classCode: string): Promise<RoomMsg[]> {
  const fp = getFilePath(classCode);
  try {
    const raw = await fs.readFile(fp, "utf8");
    const j = JSON.parse(raw) as { messages?: RoomMsg[] };
    return (j.messages || []).filter(isFresh);
  } catch {
    return [];
  }
}

async function writeFileStore(classCode: string, messages: RoomMsg[]): Promise<void> {
  const fp = getFilePath(classCode);
  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
  } catch {
    // ignore
  }
  await fs.writeFile(
    fp,
    JSON.stringify({ messages: messages.filter(isFresh) }),
    "utf8"
  );
}

/**
 * Verify whether a user is an authorized member of a classroom (either owner teacher or enrolled student).
 */
export async function isUserAuthorizedForClass(
  classCode: string,
  userId: string
): Promise<{
  authorized: boolean;
  role: "teacher" | "student";
  classroom?: Classroom;
}> {
  const normalized = classCode.trim().toUpperCase();
  if (!normalized || !userId) {
    return { authorized: false, role: "student" };
  }

  const hit = await findClassroomByCode(normalized).catch(() => null);
  if (!hit || !hit.classroom) {
    return { authorized: false, role: "student" };
  }

  const { teacherId, classroom } = hit;
  if (teacherId === userId) {
    return { authorized: true, role: "teacher", classroom };
  }

  // Check if user is in classroom.students
  const isEnrolled = (classroom.students || []).some(
    (s) => s.studentId === userId
  );
  if (isEnrolled) {
    return { authorized: true, role: "student", classroom };
  }

  // Also check if user has student metadata with joinedClassCodes
  try {
    const meta = await getTeacherMeta(userId);
    const joinedList = (meta.joinedClassCodes || []).map((c: string) =>
      c.trim().toUpperCase()
    );
    if (
      joinedList.includes(normalized) ||
      (meta.joinedClassCode &&
        meta.joinedClassCode.trim().toUpperCase() === normalized)
    ) {
      return { authorized: true, role: "student", classroom };
    }
  } catch {
    // ignore
  }

  return { authorized: false, role: "student", classroom };
}

/**
 * Load messages exclusively for a specific classroom.
 */
export async function loadClassMessages(classCode: string): Promise<RoomMsg[]> {
  const list = await readFileStore(classCode);
  return list
    .filter(isFresh)
    .sort((a, b) => b.at - a.at)
    .slice(0, 300);
}

/**
 * Add a message strictly tagged to a specific classroom.
 */
export async function addClassMessage(
  classCode: string,
  msg: RoomMsg
): Promise<RoomMsg[]> {
  const normalized = classCode.trim().toUpperCase();
  const existing = await readFileStore(normalized);
  const next = [
    msg,
    ...existing.filter((m) => m.id !== msg.id && isFresh(m)),
  ]
    .filter(isFresh)
    .slice(0, 300);

  await writeFileStore(normalized, next);
  return next;
}
