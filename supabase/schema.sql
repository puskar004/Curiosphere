-- SmartLearn Comprehensive Supabase Schema
-- Run this in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)

-- 1. Classrooms Table
CREATE TABLE IF NOT EXISTS public.classrooms (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT,
  live_session JSONB DEFAULT NULL,
  alerts JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);

-- 2. Classroom Students (Enrollments)
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classrooms(code) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  grade TEXT DEFAULT '',
  xp INT DEFAULT 0,
  streak INT DEFAULT 0,
  accuracy INT DEFAULT 0,
  mistakes INT DEFAULT 0,
  weak_subjects JSONB DEFAULT '[]'::jsonb,
  chapters_opened INT DEFAULT 0,
  joined_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  last_active BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE(class_code, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_students_code ON public.classroom_students(class_code);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student ON public.classroom_students(student_id);

-- 3. Live Attendance (Real-time Live Class Attendance)
CREATE TABLE IF NOT EXISTS public.live_attendance (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classrooms(code) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  joined_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  last_seen_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  left_at BIGINT DEFAULT NULL,
  status TEXT DEFAULT 'present',
  UNIQUE(class_code, session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_attendance_session ON public.live_attendance(class_code, session_id);
CREATE INDEX IF NOT EXISTS idx_live_attendance_student ON public.live_attendance(student_id);

-- 4. Attendance Records (Permanent Historical Session Records)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classrooms(code) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_title TEXT NOT NULL,
  subject TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_code ON public.attendance_records(class_code);

-- 5. Class Materials (PDFs, Notes, Links)
CREATE TABLE IF NOT EXISTS public.class_materials (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classrooms(code) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'notes',
  url TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  expires_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_class_materials_code ON public.class_materials(class_code);

-- 6. Chapter Assignments (Teacher Unlocked Syllabus Deadlines)
CREATE TABLE IF NOT EXISTS public.chapter_assignments (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classrooms(code) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  chapter_number INT NOT NULL,
  chapter_title TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  grade TEXT DEFAULT '',
  deadline TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE(class_code, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_assignments_code ON public.chapter_assignments(class_code);

-- 7. Coding Submissions (Online Judge, AI Viva, Anti-cheat records)
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id TEXT PRIMARY KEY,
  class_code TEXT,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  task_id TEXT NOT NULL,
  language TEXT NOT NULL,
  problem_title TEXT NOT NULL,
  code TEXT NOT NULL,
  score INT DEFAULT 0,
  passed_tests INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  submitted_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  viva_answers JSONB DEFAULT '[]'::jsonb,
  audit_metrics JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_student ON public.coding_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_task ON public.coding_submissions(task_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;

-- Permissive policies so service role and app operations run seamlessly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service and public classrooms') THEN
    CREATE POLICY "Allow service and public classrooms" ON public.classrooms FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all classroom_students') THEN
    CREATE POLICY "Allow all classroom_students" ON public.classroom_students FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all live_attendance') THEN
    CREATE POLICY "Allow all live_attendance" ON public.live_attendance FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all attendance_records') THEN
    CREATE POLICY "Allow all attendance_records" ON public.attendance_records FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all class_materials') THEN
    CREATE POLICY "Allow all class_materials" ON public.class_materials FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all chapter_assignments') THEN
    CREATE POLICY "Allow all chapter_assignments" ON public.chapter_assignments FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all coding_submissions') THEN
    CREATE POLICY "Allow all coding_submissions" ON public.coding_submissions FOR ALL USING (true);
  END IF;
END $$;
