import { promises as fs } from "fs";
import path from "path";
import { CODING_PROBLEMS } from "@/lib/coding-problems";
import type { CodingProblem, TrackId } from "@/lib/coding-types";

const mem: { problems: CodingProblem[] | null; lastRead: number } = {
  problems: null,
  lastRead: 0,
};

function getStoragePath(): string {
  const dir = process.env.VERCEL
    ? "/tmp"
    : path.join(process.cwd(), ".data");
  return path.join(dir, "coding-questions.json");
}

async function ensureDirectory(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function loadTeacherProblems(): Promise<CodingProblem[]> {
  const now = Date.now();
  if (mem.problems && now - mem.lastRead < 5000) {
    return mem.problems;
  }

  const filePath = getStoragePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      mem.problems = parsed;
      mem.lastRead = now;
      return parsed;
    }
  } catch {
    // file doesn't exist or corrupt
  }

  mem.problems = [];
  mem.lastRead = now;
  return [];
}

async function saveTeacherProblems(problems: CodingProblem[]): Promise<boolean> {
  const filePath = getStoragePath();
  try {
    await ensureDirectory(filePath);
    await fs.writeFile(filePath, JSON.stringify(problems, null, 2), "utf-8");
    mem.problems = problems;
    mem.lastRead = Date.now();
    return true;
  } catch (err) {
    console.error("Failed to save coding problems to disk:", err);
    mem.problems = problems; // keep in memory at least
    return false;
  }
}

/**
 * Get all coding problems (Teacher uploaded first, then default system problems)
 */
export async function getAllCodingProblems(track?: TrackId): Promise<CodingProblem[]> {
  const teacherList = await loadTeacherProblems();
  const all = [...teacherList, ...CODING_PROBLEMS];

  if (!track || track === "all") {
    return all;
  }
  return all.filter((p) => p.track === track);
}

/**
 * Get only teacher uploaded questions
 */
export async function getTeacherProblems(track?: TrackId): Promise<CodingProblem[]> {
  const list = await loadTeacherProblems();
  if (!track || track === "all") {
    return list;
  }
  return list.filter((p) => p.track === track);
}

/**
 * Create or save a new question uploaded by a teacher
 */
export async function createCodingProblem(
  data: Omit<CodingProblem, "id" | "source" | "createdAt"> & { id?: string; source?: "teacher" | "system" }
): Promise<CodingProblem> {
  const list = await loadTeacherProblems();
  const newProblem: CodingProblem = {
    ...data,
    id: data.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source: "teacher",
    createdAt: Date.now(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    testCases: Array.isArray(data.testCases) ? data.testCases : [],
  };

  const updated = [newProblem, ...list];
  await saveTeacherProblems(updated);
  return newProblem;
}

/**
 * Update an existing coding problem
 */
export async function updateCodingProblem(
  id: string,
  updates: Partial<CodingProblem>
): Promise<CodingProblem | null> {
  const list = await loadTeacherProblems();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) {
    return null;
  }

  const updatedProblem: CodingProblem = {
    ...list[idx],
    ...updates,
    id, // preserve id
  };
  list[idx] = updatedProblem;
  await saveTeacherProblems(list);
  return updatedProblem;
}

/**
 * Delete a teacher-uploaded coding problem
 */
export async function deleteCodingProblem(id: string): Promise<boolean> {
  const list = await loadTeacherProblems();
  const filtered = list.filter((p) => p.id !== id);
  if (filtered.length === list.length) {
    return false; // not found
  }
  await saveTeacherProblems(filtered);
  return true;
}
