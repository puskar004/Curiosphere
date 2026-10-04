/**
 * Supabase Postgres Relational Database Persistence Layer.
 * Provides atomic, race-free persistence for classrooms, live attendance, materials, and assignments.
 * Fully resilient with automatic fallback so existing flows never fail.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AttendanceAttendee,
  AttendanceRecord,
  ChapterAssignment,
  Classroom,
  StudentSnapshot,
  LiveSession,
  TeacherMaterial,
} from "@/lib/classroom-types";

function getClient() {
  return getSupabaseAdmin();
}

// -------------------------------------------------------------
// 1. LIVE ATTENDANCE (Atomic, high-concurrency safe)
// -------------------------------------------------------------

export async function dbUpsertLiveAttendance(
  classCode: string,
  sessionId: string,
  attendee: AttendanceAttendee
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const sid = sessionId.trim();
  const id = `${c}_${sid}_${attendee.studentId}`;
  const now = Date.now();

  try {
    const { error } = await sb.from("live_attendance").upsert(
      {
        id,
        class_code: c,
        session_id: sid,
        student_id: String(attendee.studentId),
        student_name: attendee.name || "Student",
        joined_at: Number(attendee.joinedAt) || now,
        last_seen_at: now,
        left_at: attendee.leftAt ? Number(attendee.leftAt) : null,
        status: "present",
      },
      { onConflict: "class_code,session_id,student_id" }
    );
    if (error) {
      console.warn("dbUpsertLiveAttendance warn:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function dbGetLiveAttendance(
  classCode: string,
  sessionId: string
): Promise<AttendanceAttendee[]> {
  const sb = getClient();
  if (!sb) return [];
  const c = classCode.trim().toUpperCase();
  const sid = sessionId.trim();

  try {
    const { data, error } = await sb
      .from("live_attendance")
      .select("student_id, student_name, joined_at, last_seen_at, left_at")
      .eq("class_code", c)
      .eq("session_id", sid)
      .order("joined_at", { ascending: true });

    if (error || !data) return [];
    return data.map((row) => ({
      studentId: row.student_id,
      name: row.student_name,
      joinedAt: Number(row.joined_at),
      leftAt: row.left_at ? Number(row.left_at) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function dbStampAttendanceLeft(
  classCode: string,
  sessionId: string,
  studentId: string
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const sid = sessionId.trim();
  const now = Date.now();

  try {
    const { error } = await sb
      .from("live_attendance")
      .update({ left_at: now, last_seen_at: now })
      .eq("class_code", c)
      .eq("session_id", sid)
      .eq("student_id", studentId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 2. ATTENDANCE RECORDS (Permanent history of finished classes)
// -------------------------------------------------------------

export async function dbSaveAttendanceRecord(
  classCode: string,
  record: AttendanceRecord
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const id = record.id || `att-${record.sessionId || Date.now()}`;

  try {
    const { error } = await sb.from("attendance_records").upsert(
      {
        id,
        class_code: c,
        session_id: record.sessionId || id,
        session_title: record.sessionTitle || "Live Class",
        subject: record.subject || "General",
        started_at: Number(record.startedAt) || Date.now(),
        ended_at: record.endedAt ? Number(record.endedAt) : Date.now(),
        attendees: record.attendees || [],
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("dbSaveAttendanceRecord warn:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function dbGetAttendanceRecords(
  classCode: string
): Promise<AttendanceRecord[]> {
  const sb = getClient();
  if (!sb) return [];
  const c = classCode.trim().toUpperCase();

  try {
    const { data, error } = await sb
      .from("attendance_records")
      .select("*")
      .eq("class_code", c)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      sessionTitle: row.session_title,
      subject: row.subject,
      startedAt: Number(row.started_at),
      endedAt: row.ended_at ? Number(row.ended_at) : undefined,
      attendees: Array.isArray(row.attendees) ? row.attendees : [],
    }));
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// 3. CLASSROOMS
// -------------------------------------------------------------

export async function dbUpsertClassroom(room: Classroom): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const code = room.code.trim().toUpperCase();
  const now = Date.now();

  try {
    const { error } = await sb.from("classrooms").upsert(
      {
        code,
        name: room.name || code,
        teacher_id: room.teacherId,
        teacher_name: room.teacherName || "",
        live_session: room.liveSession || null,
        alerts: room.alerts || [],
        created_at: Number(room.createdAt) || now,
        updated_at: now,
      },
      { onConflict: "code" }
    );
    if (error) {
      console.warn("dbUpsertClassroom warn:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function dbGetClassroom(code: string): Promise<Classroom | null> {
  const sb = getClient();
  if (!sb) return null;
  const c = code.trim().toUpperCase();

  try {
    const { data, error } = await sb
      .from("classrooms")
      .select("*")
      .eq("code", c)
      .single();

    if (error || !data) return null;

    // Load related items in parallel
    const [students, materials, assignments, attendanceLog] = await Promise.all([
      dbListStudents(c),
      dbListMaterials(c),
      dbListChapterAssignments(c),
      dbGetAttendanceRecords(c),
    ]);

    return {
      code: data.code,
      name: data.name,
      teacherId: data.teacher_id,
      teacherName: data.teacher_name,
      createdAt: Number(data.created_at),
      liveSession: data.live_session as LiveSession | null,
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
      students,
      materials,
      chapterAssignments: assignments,
      attendanceLog,
    };
  } catch {
    return null;
  }
}

export async function dbListTeacherClassrooms(
  teacherId: string
): Promise<Classroom[]> {
  const sb = getClient();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from("classrooms")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error || !data || !data.length) return [];

    const rooms = await Promise.all(
      data.map(async (row) => {
        const c = row.code;
        const [students, materials, assignments, attendanceLog] =
          await Promise.all([
            dbListStudents(c),
            dbListMaterials(c),
            dbListChapterAssignments(c),
            dbGetAttendanceRecords(c),
          ]);
        return {
          code: row.code,
          name: row.name,
          teacherId: row.teacher_id,
          teacherName: row.teacher_name,
          createdAt: Number(row.created_at),
          liveSession: row.live_session as LiveSession | null,
          alerts: Array.isArray(row.alerts) ? row.alerts : [],
          students,
          materials,
          chapterAssignments: assignments,
          attendanceLog,
        } as Classroom;
      })
    );
    return rooms;
  } catch {
    return [];
  }
}

export async function dbDeleteClassroom(code: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = code.trim().toUpperCase();

  try {
    const { error } = await sb.from("classrooms").delete().eq("code", c);
    return !error;
  } catch {
    return false;
  }
}

export async function dbSetRoomLiveSession(
  code: string,
  live: LiveSession | null
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = code.trim().toUpperCase();

  try {
    const { error } = await sb
      .from("classrooms")
      .update({ live_session: live, updated_at: Date.now() })
      .eq("code", c);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 4. STUDENTS / ENROLLMENTS
// -------------------------------------------------------------

export async function dbEnrollStudent(
  classCode: string,
  student: StudentSnapshot
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const id = `${c}_${student.studentId}`;
  const now = Date.now();

  try {
    const { error } = await sb.from("classroom_students").upsert(
      {
        id,
        class_code: c,
        student_id: student.studentId,
        student_name: student.name || "Student",
        student_email: student.email || null,
        grade: student.grade || "",
        xp: Number(student.xp) || 0,
        streak: Number(student.streak) || 0,
        accuracy: Number(student.accuracy) || 0,
        mistakes: Number(student.mistakes) || 0,
        weak_subjects: student.weakSubjects || [],
        chapters_opened: Number(student.chaptersOpened) || 0,
        joined_at: Number(student.joinedAt) || now,
        last_active: Number(student.lastActive) || now,
      },
      { onConflict: "class_code,student_id" }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function dbListStudents(
  classCode: string
): Promise<StudentSnapshot[]> {
  const sb = getClient();
  if (!sb) return [];
  const c = classCode.trim().toUpperCase();

  try {
    const { data, error } = await sb
      .from("classroom_students")
      .select("*")
      .eq("class_code", c)
      .order("last_active", { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      studentId: r.student_id,
      name: r.student_name,
      email: r.student_email || undefined,
      grade: r.grade || "",
      xp: Number(r.xp) || 0,
      streak: Number(r.streak) || 0,
      accuracy: Number(r.accuracy) || 0,
      mistakes: Number(r.mistakes) || 0,
      weakSubjects: Array.isArray(r.weak_subjects) ? r.weak_subjects : [],
      chaptersOpened: Number(r.chapters_opened) || 0,
      joinedAt: Number(r.joined_at),
      lastActive: Number(r.last_active),
      recentMistakes: [],
    }));
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// 5. CLASS MATERIALS
// -------------------------------------------------------------

export async function dbUpsertMaterial(
  classCode: string,
  teacherId: string,
  mat: TeacherMaterial
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const id = mat.id || `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const { error } = await sb.from("class_materials").upsert(
      {
        id,
        class_code: c,
        teacher_id: teacherId,
        teacher_name: mat.teacherName || "Teacher",
        title: mat.title || "Material",
        type: mat.type || "notes",
        url: mat.url,
        subject: mat.subject || "General",
        created_at: Number(mat.createdAt) || Date.now(),
        expires_at: mat.expiresAt ? Number(mat.expiresAt) : null,
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function dbListMaterials(
  classCode: string
): Promise<TeacherMaterial[]> {
  const sb = getClient();
  if (!sb) return [];
  const c = classCode.trim().toUpperCase();

  try {
    const { data, error } = await sb
      .from("class_materials")
      .select("*")
      .eq("class_code", c)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      title: r.title,
      type: (r.type === "video" || r.type === "link" ? r.type : "notes") as
        | "notes"
        | "video"
        | "link",
      url: r.url,
      subject: r.subject,
      teacherName: r.teacher_name,
      createdAt: Number(r.created_at),
      expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function dbDeleteMaterial(id: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from("class_materials").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 6. CHAPTER ASSIGNMENTS
// -------------------------------------------------------------

export async function dbUpsertChapterAssignment(
  classCode: string,
  assign: ChapterAssignment
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();
  const id = `${c}_${assign.chapterId}`;

  try {
    const { error } = await sb.from("chapter_assignments").upsert(
      {
        id,
        class_code: c,
        chapter_id: assign.chapterId,
        chapter_number: Number(assign.chapterNumber) || 1,
        chapter_title: assign.chapterTitle,
        subject_name: assign.subjectName,
        grade: assign.grade || "",
        deadline: assign.deadline,
        note: assign.note || "",
        created_at: Date.now(),
      },
      { onConflict: "class_code,chapter_id" }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function dbListChapterAssignments(
  classCode: string
): Promise<ChapterAssignment[]> {
  const sb = getClient();
  if (!sb) return [];
  const c = classCode.trim().toUpperCase();

  try {
    const { data, error } = await sb
      .from("chapter_assignments")
      .select("*")
      .eq("class_code", c)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id || `${c}_${r.chapter_id}`,
      subjectId:
        r.subject_id ||
        String(r.subject_name || "general")
          .toLowerCase()
          .replace(/\s+/g, "-"),
      chapterId: r.chapter_id,
      chapterNumber: Number(r.chapter_number) || 1,
      chapterTitle: r.chapter_title || "Chapter",
      subjectName: r.subject_name || "General",
      grade: r.grade || "",
      deadline: r.deadline,
      assignedAt: Number(r.created_at) || Date.now(),
      note: r.note || undefined,
    }));
  } catch {
    return [];
  }
}

export async function dbDeleteChapterAssignment(
  classCode: string,
  chapterId: string
): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const c = classCode.trim().toUpperCase();

  try {
    const { error } = await sb
      .from("chapter_assignments")
      .delete()
      .eq("class_code", c)
      .eq("chapter_id", chapterId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 7. CODING SUBMISSIONS
// -------------------------------------------------------------

export async function dbSaveCodingSubmission(sub: {
  id?: string;
  classCode?: string;
  studentId: string;
  studentName: string;
  taskId: string;
  language: string;
  problemTitle: string;
  code: string;
  score?: number;
  passedTests?: number;
  totalTests?: number;
  vivaAnswers?: unknown;
  auditMetrics?: unknown;
}): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const id = sub.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const { error } = await sb.from("coding_submissions").upsert(
      {
        id,
        class_code: sub.classCode ? sub.classCode.toUpperCase() : null,
        student_id: sub.studentId,
        student_name: sub.studentName,
        task_id: sub.taskId,
        language: sub.language,
        problem_title: sub.problemTitle,
        code: sub.code,
        score: sub.score || 0,
        passed_tests: sub.passedTests || 0,
        total_tests: sub.totalTests || 0,
        submitted_at: Date.now(),
        viva_answers: sub.vivaAnswers || [],
        audit_metrics: sub.auditMetrics || {},
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}
