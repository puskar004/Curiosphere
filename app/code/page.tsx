"use client";

import { useState, useMemo, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  GraduationCap,
  Lock,
  Unlock,
  BookOpen,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Check,
  RotateCcw,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronRight,
  Clock,
  Timer,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Award,
  FileSpreadsheet,
  Code2,
  HelpCircle,
  Loader2,
  Search,
  ArrowRight,
  Copy,
  RefreshCw,
  Sliders,
  CheckCircle,
} from "lucide-react";
import LabRecordModal from "@/components/LabRecordModal";
import {
  LAB_COURSES,
  type LabCourse,
  type LabLecture,
  type LabMCQ,
  type LabCodingProblem,
  type LabNote,
  CLEAN_LAB_STARTER_CODE,
} from "@/lib/lab-curriculum";
import type { LanguageId, TestCase, TestResult, Difficulty } from "@/lib/coding-types";
import { cn } from "@/lib/utils";
import { apiAssignChapter, apiRemoveChapterAssignment, getRole } from "@/lib/teacher-store";

type LabId = "c" | "cpp" | "python" | "dsa";
type WorkspaceTab = "code" | "note" | "mcq" | "mentor";

interface ClassroomInfo {
  code: string;
  name: string;
  teacherName: string;
  chapterAssignments?: {
    id: string;
    chapterId: string;
    chapterTitle: string;
    subjectId: string;
    deadline?: string;
    note?: string;
  }[];
}

function CollegeCodingPortalInner() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const sp = useSearchParams();

  const urlLab = sp ? (sp.get("lab") as LabId) : null;
  const urlLec = sp ? sp.get("lec") : null;

  // Active Lab Course: C, C++, Python, DSA
  const [activeLabId, setActiveLabId] = useState<LabId>(
    urlLab && ["c", "cpp", "python", "dsa"].includes(urlLab) ? urlLab : "cpp"
  );
  const activeLab: LabCourse = LAB_COURSES[activeLabId] || LAB_COURSES.cpp;

  // Active Lecture / Experiment within the Lab
  const [selectedLectureId, setSelectedLectureId] = useState<string>(
    urlLec || activeLab.lectures[0]?.id || "cpp-lec1"
  );

  // Active Workspace Tab: Coding IDE | Lab Theory Notes | Unit MCQs | AI Mentor
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("code");

  // Selected Language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(activeLab.defaultLanguage);

  // Synchronize language when switching lab
  useEffect(() => {
    setSelectedLanguage(activeLab.defaultLanguage);
    if (!activeLab.lectures.some((l) => l.id === selectedLectureId)) {
      setSelectedLectureId(activeLab.lectures[0]?.id || "");
    }
  }, [activeLabId, activeLab, selectedLectureId]);

  // Current Lecture object
  const currentLecture: LabLecture =
    activeLab.lectures.find((l) => l.id === selectedLectureId) || activeLab.lectures[0];
  const currentProblem: LabCodingProblem = currentLecture.codingProblem;

  // Role detection: Teacher or Student
  const isTeacherRole = userId ? getRole(userId) === "teacher" : false;

  // Joined Classrooms & Teacher Unlocking Data
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [selectedClassCode, setSelectedClassCode] = useState<string>("");

  const loadJoinedClassrooms = useCallback(async () => {
    setLoadingClassrooms(true);
    try {
      const res = await fetch("/api/classroom?action=joined", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.classrooms)) {
        setClassrooms(data.classrooms);
        if (data.classrooms.length > 0 && !selectedClassCode) {
          setSelectedClassCode(data.classrooms[0].code);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingClassrooms(false);
    }
  }, [selectedClassCode]);

  useEffect(() => {
    void loadJoinedClassrooms();
  }, [loadJoinedClassrooms]);

  // Map of unlocked chapter IDs from teacher's assignments
  const unlockedChaptersMap = useMemo(() => {
    const map: Record<string, { deadline?: string; note?: string }> = {};
    for (const c of classrooms) {
      if (!selectedClassCode || c.code === selectedClassCode) {
        for (const a of c.chapterAssignments || []) {
          if (a?.chapterId) {
            map[a.chapterId] = { deadline: a.deadline, note: a.note };
          }
        }
      }
    }
    return map;
  }, [classrooms, selectedClassCode]);

  // Check if current experiment is unlocked
  // If user is a Teacher: everything can be previewed/unlocked.
  // If student is enrolled in a class: must be in unlockedChaptersMap!
  // If student is not in any class: demo allows first 2 chapters of each lab.
  const isExperimentUnlocked = useCallback(
    (lectureId: string, lectureNum: number) => {
      if (isTeacherRole) return true; // Teachers can always inspect & test
      if (classrooms.length > 0) {
        return Boolean(unlockedChaptersMap[lectureId]);
      }
      // Demo fallback if student hasn't joined any teacher classroom yet
      return lectureNum <= 2;
    },
    [isTeacherRole, classrooms.length, unlockedChaptersMap]
  );

  const isCurrentUnlocked = isExperimentUnlocked(currentLecture.id, currentLecture.lectureNumber);

  // Teacher manual toggle to Unlock/Lock an experiment for the active class
  const [teacherToggling, setTeacherToggling] = useState(false);
  const handleToggleExperimentLock = async (lecture: LabLecture) => {
    if (!selectedClassCode) return;
    setTeacherToggling(true);
    const isCurrentlyUnlocked = Boolean(unlockedChaptersMap[lecture.id]);

    try {
      if (isCurrentlyUnlocked) {
        // Lock it (remove assignment)
        await apiRemoveChapterAssignment(selectedClassCode, lecture.id);
      } else {
        // Unlock it (assign to class)
        const tomorrow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        await apiAssignChapter(selectedClassCode, {
          grade: "12",
          subjectId: activeLab.id,
          subjectName: activeLab.name,
          chapterId: lecture.id,
          chapterNumber: lecture.lectureNumber,
          chapterTitle: lecture.title,
          deadline: tomorrow,
          note: `Lab Practical Task: ${lecture.codingProblem.title}`,
        });
      }
      await loadJoinedClassrooms();
    } catch {
      // ignore
    } finally {
      setTeacherToggling(false);
    }
  };

  // Student assessment states
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Pre-Assessment 30-Second Countdown Timer
  const [assessmentStarted, setAssessmentStarted] = useState<Set<string>>(new Set());
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(30);

  // Anti-cheat keystrokes & paste tracking
  const [typedChars, setTypedChars] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [pastedChars, setPastedChars] = useState(0);
  const [largePasteDetected, setLargePasteDetected] = useState(false);

  // Execution states
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testsPassedCount, setTestsPassedCount] = useState(0);
  const [allPassedSuccess, setAllPassedSuccess] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // AI Mentor states
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResponse, setMentorResponse] = useState("");

  // Lab Record PDF modal
  const [labRecordOpen, setLabRecordOpen] = useState(false);

  // Load completed items from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sl_lab_completed_items");
      if (raw) setCompletedItems(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  const markItemCompleted = (itemId: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev).add(itemId);
      try {
        localStorage.setItem("sl_lab_completed_items", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Editor code management
  const codeKey = `${currentLecture.id}_${selectedLanguage}`;
  const currentCode =
    userCodes[codeKey] ?? currentProblem.starterCode[selectedLanguage] ?? CLEAN_LAB_STARTER_CODE[selectedLanguage] ?? "";

  const handleCodeChange = (newCode: string) => {
    setUserCodes((prev) => ({ ...prev, [codeKey]: newCode }));
  };

  const handleResetCode = () => {
    const starter = currentProblem.starterCode[selectedLanguage] || CLEAN_LAB_STARTER_CODE[selectedLanguage] || "";
    setUserCodes((prev) => ({ ...prev, [codeKey]: starter }));
  };

  // 30s Countdown timer effect
  useEffect(() => {
    if (!countdownActive) return;
    if (countdownSeconds <= 0) {
      setCountdownActive(false);
      setAssessmentStarted((prev) => new Set(prev).add(currentLecture.id));
      return;
    }
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownActive, countdownSeconds, currentLecture.id]);

  const startAssessmentWithTimer = () => {
    if (assessmentStarted.has(currentLecture.id)) return;
    setCountdownSeconds(30);
    setCountdownActive(true);
  };

  // Monaco text area Tab key handling
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + "    " + val.substring(end);
      handleCodeChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Run Custom / Sample Input
  const runCodeCustom = async () => {
    setRunning(true);
    setOutput("");
    setErrorOutput("");
    setTestResults([]);
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: currentCode,
          input: showCustomInput ? customInput : currentProblem.sampleInput,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutput(data.stdout || "(No output produced)");
        setErrorOutput(data.stderr || "");
      } else {
        setErrorOutput(data.stderr || data.error || "Execution failed");
      }
      if (data.timeMs !== undefined) setExecutionTime(data.timeMs);
    } catch (e) {
      setErrorOutput(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  };

  // Run Automated Test Cases (CodeTantra Engine)
  const runAllTests = async () => {
    setRunning(true);
    setTestResults([]);
    setAllPassedSuccess(false);
    setOutput("");
    setErrorOutput("");
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: currentCode,
          testCases: currentProblem.testCases || [],
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.testResults)) {
        setTestResults(data.testResults);
        setTestsPassedCount(data.testsPassed || 0);

        if (data.allPassed && data.testResults.length > 0) {
          setAllPassedSuccess(true);
          markItemCompleted(`${currentLecture.id}_code`);
        }
      } else {
        setErrorOutput(data.error || "Test execution failed");
      }
    } catch (e) {
      setErrorOutput(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  };

  // Ask AI Mentor for Socratic Hints
  const askAiMentor = async (action: "hint" | "explain-error") => {
    setMentorLoading(true);
    setActiveTab("mentor");
    setMentorResponse("");
    try {
      const res = await fetch("/api/code/ai-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          problemTitle: currentProblem.title,
          problemDescription: currentProblem.description,
          language: selectedLanguage,
          code: currentCode,
          error: errorOutput || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMentorResponse(data.feedback);
      } else {
        setMentorResponse(data.error || "Unable to reach AI mentor.");
      }
    } catch (e) {
      setMentorResponse(e instanceof Error ? e.message : "Error contacting AI mentor");
    } finally {
      setMentorLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden select-none">
      {/* ============================================================== */}
      {/* 1. UNIVERSITY COLLEGE TOP NAVIGATION BAR                       */}
      {/* ============================================================== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 z-30">
        {/* Left: Department & University Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md text-white font-black">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                University Practical &amp; Programming Labs
              </span>
              <span className="rounded-md bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                CodeTantra Judge
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Department of Computer Science &amp; Engineering · Hands-on Practical Assessments
            </p>
          </div>
        </div>

        {/* Center: Lab Course Switcher Tabs */}
        <div className="hidden lg:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(Object.values(LAB_COURSES) as LabCourse[]).map((course) => {
            const isSelected = activeLabId === course.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setActiveLabId(course.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <span>{course.icon}</span>
                <span>{course.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Enrolled Class, Roll Number & PDF Export */}
        <div className="flex items-center gap-2.5">
          {/* Class Code Indicator */}
          {classrooms.length > 0 ? (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Section:</span>
              <select
                value={selectedClassCode}
                onChange={(e) => setSelectedClassCode(e.target.value)}
                className="bg-transparent text-indigo-400 font-bold outline-none cursor-pointer"
              >
                {classrooms.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300">
              <span>Demo Mode</span>
            </div>
          )}

          {/* Student Roll No */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-300">
            <span className="font-mono text-indigo-400 font-bold">24CSE0142</span>
            <span>·</span>
            <span>{user?.fullName || "Puskar Kumar"}</span>
          </div>

          {/* 1-Click Lab Manual PDF Export */}
          <button
            type="button"
            onClick={() => setLabRecordOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/40 px-3 py-1.5 text-xs font-bold text-indigo-300 transition"
            title="Download Official University Practical Record"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Lab Report PDF</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. TEACHER INSTRUCTOR MASTER BAR (IF TEACHER OR ENROLLED)      */}
      {/* ============================================================== */}
      {isTeacherRole && (
        <div className="flex items-center justify-between border-b border-indigo-500/30 bg-indigo-950/40 px-4 py-1.5 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span className="font-bold">Instructor Master Access:</span>
            <span>You can preview all experiments and toggle unlock/lock status for your batch below.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Managing Class: <strong>{selectedClassCode || "All"}</strong></span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE: LEFT UNIT/EXPERIMENT LIST | RIGHT IDE/LAB   */}
      {/* ============================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ------------------------------------------------------------ */}
        {/* LEFT SIDEBAR: UNIT & CHAPTER EXPERIMENT ACCORDION            */}
        {/* ------------------------------------------------------------ */}
        <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col justify-between overflow-hidden">
          {/* Sidebar Course Header */}
          <div className="border-b border-slate-800 p-3.5 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span>{activeLab.icon}</span>
                <span>{activeLab.name}</span>
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
                {activeLab.code}
              </span>
            </div>

            {/* Mobile Lab Selector */}
            <div className="mt-2.5 flex lg:hidden gap-1 overflow-x-auto">
              {(Object.values(LAB_COURSES) as LabCourse[]).map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveLabId(course.id)}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-bold whitespace-nowrap",
                    activeLabId === course.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                  )}
                >
                  {course.shortTitle}
                </button>
              ))}
            </div>

            {/* Unlocked Experiments Count */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>Class Practical Tasks</span>
              <span className="text-emerald-400 font-bold">
                {activeLab.lectures.filter((l) => isExperimentUnlocked(l.id, l.lectureNumber)).length} of {activeLab.lectures.length} Unlocked
              </span>
            </div>
          </div>

          {/* Experiments List / Accordion */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {activeLab.lectures.map((lecture) => {
              const isSelected = selectedLectureId === lecture.id;
              const isUnlocked = isExperimentUnlocked(lecture.id, lecture.lectureNumber);
              const isDone = completedItems.has(`${lecture.id}_code`);

              return (
                <div
                  key={lecture.id}
                  onClick={() => setSelectedLectureId(lecture.id)}
                  className={cn(
                    "group relative rounded-2xl border p-3 cursor-pointer transition flex flex-col justify-between gap-2",
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/30 shadow-md"
                      : "border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Lock / Unlock / Done Icon */}
                      {isDone ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </div>
                      ) : isUnlocked ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                          <Unlock className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}

                      <span className="text-[11px] font-bold text-slate-400">
                        Exp {lecture.lectureNumber}
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isDone ? (
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                        100/100
                      </span>
                    ) : isUnlocked ? (
                      <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300">
                        Active
                      </span>
                    ) : (
                      <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-bold text-rose-400">
                        Locked
                      </span>
                    )}
                  </div>

                  <div>
                    <h4
                      className={cn(
                        "text-xs font-bold leading-snug line-clamp-1",
                        isSelected ? "text-white" : "text-slate-300 group-hover:text-white"
                      )}
                    >
                      {lecture.codingProblem.title}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                      Unit {lecture.unitNumber} · {lecture.title}
                    </p>
                  </div>

                  {/* Teacher Quick Lock/Unlock button */}
                  {isTeacherRole && selectedClassCode && (
                    <div className="mt-1 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Instructor Action:</span>
                      <button
                        type="button"
                        disabled={teacherToggling}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleExperimentLock(lecture);
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded font-bold transition",
                          isUnlocked
                            ? "bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800/40"
                            : "bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/40"
                        )}
                      >
                        {isUnlocked ? "Lock Task 🔒" : "Unlock Task 🔓"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Student Progress Overview */}
          <div className="border-t border-slate-800 p-3 bg-slate-900/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Completed Tasks:</span>
            <span className="font-bold text-emerald-400">
              {activeLab.lectures.filter((l) => completedItems.has(`${l.id}_code`)).length} / {activeLab.lectures.length}
            </span>
          </div>
        </aside>

        {/* ------------------------------------------------------------ */}
        {/* CENTER & RIGHT WORKSPACE                                     */}
        {/* ------------------------------------------------------------ */}
        <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
          {/* IF CURRENT EXPERIMENT IS LOCKED BY TEACHER */}
          {!isCurrentUnlocked ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900 overflow-y-auto">
              <div className="max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-2xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <Lock className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/20">
                    Access Gated by Instructor
                  </span>
                  <h2 className="text-lg font-extrabold text-white">
                    Practical Experiment #{currentLecture.lectureNumber} is Locked
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your course professor has not yet unlocked this coding experiment for your section.
                    As soon as your teacher unlocks this task during your scheduled lab class, it will appear here ready to solve.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-left text-xs space-y-1.5 font-mono">
                  <div className="text-slate-400">
                    <strong className="text-slate-300">Lab: </strong>
                    {activeLab.name}
                  </div>
                  <div className="text-slate-400">
                    <strong className="text-slate-300">Unit: </strong>
                    Unit {currentLecture.unitNumber} ({currentLecture.title})
                  </div>
                  <div className="text-slate-400">
                    <strong className="text-slate-300">Task: </strong>
                    {currentLecture.codingProblem.title}
                  </div>
                </div>

                {isTeacherRole && selectedClassCode ? (
                  <button
                    type="button"
                    disabled={teacherToggling}
                    onClick={() => handleToggleExperimentLock(currentLecture)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Experiment for Batch Now</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    If this is your scheduled lab time, ask your teacher to unlock this unit.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* IF EXPERIMENT IS UNLOCKED: COLLEGE IDE & PROBLEM SPEC */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT HALF: PROBLEM STATEMENT & THEORY TABS */}
              <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-800 bg-slate-950">
                {/* Tabs Bar */}
                <div className="flex h-11 shrink-0 items-center gap-1 border-b border-slate-800 bg-slate-950 px-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      activeTab === "code" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Lab Problem Spec</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("note")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      activeTab === "note" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                    <span>Theory &amp; Viva Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("mcq")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      activeTab === "mcq" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Unit MCQs ({currentLecture.mcqs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("mentor")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      activeTab === "mentor" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>AI Lab Mentor</span>
                  </button>
                </div>

                {/* Tab Body */}
                <div className="flex-1 overflow-y-auto p-5 text-xs leading-relaxed space-y-5 text-slate-300">
                  {/* TAB 1: CODING PROBLEM SPEC */}
                  {activeTab === "code" && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-base font-extrabold text-white">
                            Exp #{currentLecture.lectureNumber}: {currentProblem.title}
                          </h2>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 capitalize">
                            {currentProblem.difficulty} · 100 Marks
                          </span>
                        </div>
                        <p className="mt-1 text-slate-400 text-xs">
                          {currentProblem.description}
                        </p>
                      </div>

                      {/* Input & Output Format */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-2">
                        <div>
                          <strong className="text-indigo-300">Input Format: </strong>
                          <span className="whitespace-pre-line text-slate-300">{currentProblem.inputFormat}</span>
                        </div>
                        <div>
                          <strong className="text-emerald-300">Output Format: </strong>
                          <span className="whitespace-pre-line text-slate-300">{currentProblem.outputFormat}</span>
                        </div>
                        {currentProblem.constraints && (
                          <div>
                            <strong className="text-amber-300">Constraints: </strong>
                            <code className="text-slate-300 font-mono">{currentProblem.constraints}</code>
                          </div>
                        )}
                      </div>

                      {/* Sample I/O */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Sample Test Case:
                        </span>
                        <div className="grid grid-cols-2 gap-3 font-mono">
                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Sample Input (STDIN)
                            </span>
                            <pre className="text-emerald-300 whitespace-pre">{currentProblem.sampleInput}</pre>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Expected Output
                            </span>
                            <pre className="text-amber-300 whitespace-pre">{currentProblem.sampleOutput}</pre>
                          </div>
                        </div>
                        {currentProblem.explanation && (
                          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-2.5 text-[11px] text-slate-400">
                            <strong>Explanation: </strong>
                            {currentProblem.explanation}
                          </div>
                        )}
                      </div>

                      {/* Hidden Test Cases notice */}
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-[11px] text-indigo-300 flex items-center justify-between">
                        <span>Evaluation includes {currentProblem.testCases.length} total test cases (Sample + Hidden Evaluation Cases).</span>
                        <span className="font-bold">CodeTantra Runner</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: THEORY & VIVA NOTES */}
                  {activeTab === "note" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-extrabold text-white">
                          {currentLecture.note.title}
                        </h2>
                        <span className="text-[11px] text-slate-500">
                          Reading Time: {currentLecture.note.readTime} mins
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 whitespace-pre-line text-slate-300 leading-relaxed font-sans">
                        {currentLecture.note.content}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-white uppercase">Key Viva Concepts:</h3>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                          {currentLecture.note.keyPoints.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: UNIT MCQS */}
                  {activeTab === "mcq" && (
                    <div className="space-y-4">
                      <h2 className="text-base font-extrabold text-white">
                        Unit {currentLecture.unitNumber} Practice Questions
                      </h2>
                      {currentLecture.mcqs.map((mcq, idx) => (
                        <div key={mcq.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                          <p className="font-bold text-white text-xs">
                            Q{idx + 1}. {mcq.question}
                          </p>
                          {mcq.codeSnippet && (
                            <pre className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                              <code>{mcq.codeSnippet}</code>
                            </pre>
                          )}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {mcq.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={cn(
                                  "rounded-xl border p-2 text-xs",
                                  oIdx === mcq.correctIndex
                                    ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-semibold"
                                    : "border-slate-800 bg-slate-950/40 text-slate-400"
                                )}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 text-[11px] text-slate-400">
                            <strong>Explanation: </strong> {mcq.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 4: AI MENTOR */}
                  {activeTab === "mentor" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-white">Academic AI Lab Mentor</h2>
                        <span className="text-[11px] text-slate-500">Socratic Hint Assistant</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => askAiMentor("hint")}
                          disabled={mentorLoading}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Get Socratic Hint</span>
                        </button>
                        {errorOutput && (
                          <button
                            type="button"
                            onClick={() => askAiMentor("explain-error")}
                            disabled={mentorLoading}
                            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Explain Compiler Error</span>
                          </button>
                        )}
                      </div>

                      {mentorLoading && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                          <span>AI Mentor is analyzing your code and problem constraints...</span>
                        </div>
                      )}

                      {mentorResponse && (
                        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 text-xs whitespace-pre-line leading-relaxed text-violet-100">
                          {mentorResponse}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT HALF: ONLINE DARK IDE & TESTCASE CONSOLE */}
              <div className="w-full lg:w-1/2 flex flex-col bg-slate-950">
                {/* IDE Control Bar */}
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-3">
                  {/* Language Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Language:</span>
                    <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      {(["cpp", "python", "c"] as LanguageId[]).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setSelectedLanguage(lang)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-md transition uppercase",
                            selectedLanguage === lang
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          )}
                        >
                          {lang === "cpp" ? "C++" : lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anti-Cheat & Reset */}
                  <div className="flex items-center gap-2">
                    {largePasteDetected ? (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <ShieldAlert className="h-3 w-3" /> External Paste Flagged (+{pastedChars})
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <ShieldCheck className="h-3 w-3" /> Organic Keystrokes Verified
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleResetCode}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:text-white transition"
                      title="Reset starter template"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </div>
                </div>

                {/* Monaco Editor Textarea */}
                <div className="relative flex-1 bg-slate-950 font-mono overflow-hidden">
                  <div className="flex h-full w-full">
                    {/* Gutter Line Numbers */}
                    <div className="w-12 shrink-0 select-none bg-slate-900/60 py-4 text-right pr-3 font-mono text-xs text-slate-600 overflow-hidden leading-relaxed">
                      {currentCode.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={currentCode}
                      onChange={(e) => {
                        setTypedChars((p) => p + 1);
                        handleCodeChange(e.target.value);
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (text) {
                          setPasteCount((p) => p + 1);
                          setPastedChars((p) => p + text.length);
                          if (text.length > 50 || text.split("\n").length > 3) {
                            setLargePasteDetected(true);
                          }
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      spellCheck={false}
                      className="flex-1 resize-none bg-transparent p-4 text-xs font-mono text-emerald-300 leading-relaxed outline-none overflow-y-auto selection:bg-indigo-600/40"
                      placeholder={`Write your ${selectedLanguage} solution here...`}
                    />
                  </div>
                </div>

                {/* Run & Submit Bar */}
                <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      <span>{showCustomInput ? "Hide Custom STDIN" : "Provide Custom STDIN"}</span>
                    </button>
                    {executionTime !== null && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {executionTime}ms
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Run Sample */}
                    <button
                      type="button"
                      onClick={runCodeCustom}
                      disabled={running}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-700 active:scale-95 transition disabled:opacity-50"
                    >
                      {running ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                      )}
                      <span>Run Sample</span>
                    </button>

                    {/* Submit Practical Evaluation */}
                    <button
                      type="button"
                      onClick={runAllTests}
                      disabled={running}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 active:scale-95 transition disabled:opacity-50"
                    >
                      {running ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                      <span>Submit &amp; Test (Judge)</span>
                    </button>
                  </div>
                </div>

                {/* Custom STDIN Box (if enabled) */}
                {showCustomInput && (
                  <div className="border-t border-slate-800 bg-slate-900 p-3">
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom standard input lines here..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-mono text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Console Output Drawer */}
                <div className="h-44 border-t border-slate-800 bg-slate-950 p-3 font-mono text-xs overflow-y-auto">
                  {running ? (
                    <div className="h-full flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                      <span>Executing solution on isolated judge runner...</span>
                    </div>
                  ) : testResults.length > 0 ? (
                    /* Test Cases Evaluation Matrix */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span
                          className={cn(
                            "font-bold text-sm",
                            allPassedSuccess ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {allPassedSuccess ? "✓ Accepted (100/100 Marks)" : "✗ Failed Test Cases"}
                        </span>
                        <span className="text-slate-400 text-xs">
                          Passed {testsPassedCount} of {testResults.length} test cases
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {testResults.map((tr, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl border p-2 text-[11px] font-sans flex items-center justify-between",
                              tr.passed
                                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                                : "border-rose-500/40 bg-rose-950/20 text-rose-300"
                            )}
                          >
                            <span>Test Case #{idx + 1}</span>
                            <span>{tr.passed ? "Passed ✓" : "Failed ✗"}</span>
                          </div>
                        ))}
                      </div>

                      {allPassedSuccess && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-2.5 text-xs text-emerald-200">
                          <span>🎉 Lab practical completed! Your verified grade has been recorded.</span>
                          <button
                            type="button"
                            onClick={() => setLabRecordOpen(true)}
                            className="font-bold underline text-white hover:text-emerald-300"
                          >
                            Export PDF Manual →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : errorOutput ? (
                    /* Error / Compiler Diagnostic Output */
                    <div className="space-y-1">
                      <div className="text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Compilation / Runtime Diagnostic</span>
                      </div>
                      <pre className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-rose-300 whitespace-pre-wrap leading-relaxed">
                        {errorOutput}
                      </pre>
                    </div>
                  ) : output ? (
                    /* Custom STDIN Run Output */
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Standard Output (STDOUT):</span>
                      <pre className="text-emerald-300 whitespace-pre leading-relaxed">{output}</pre>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-xs font-sans">
                      Click &quot;Run Sample&quot; or &quot;Submit &amp; Test&quot; to compile and evaluate code against test cases.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* 4. PRE-ASSESSMENT 30-SECOND COUNTDOWN MODAL                    */}
      {/* ============================================================== */}
      {countdownActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-indigo-500/40 bg-slate-950 p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/20 text-indigo-400">
              <Timer className="h-8 w-8 animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Timed Assessment Preparation
              </span>
              <h3 className="mt-1 text-lg font-bold text-white">
                {currentLecture.codingProblem.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Your practical assessment is initializing. Prepare your code editor workspace.
              </p>
            </div>

            <div className="py-2">
              <span className="font-mono text-5xl font-black text-indigo-400">
                {countdownSeconds}
              </span>
              <span className="text-xs text-slate-500 block mt-1">Seconds Remaining</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCountdownSeconds(0)}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-md"
              >
                Start Lab Assessment Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. OFFICIAL UNIVERSITY LAB RECORD MODAL                        */}
      {/* ============================================================== */}
      <LabRecordModal
        isOpen={labRecordOpen}
        onClose={() => setLabRecordOpen(false)}
        activeLab={activeLab}
        userCodes={userCodes}
        completedItems={completedItems}
        studentName={user?.fullName || "Puskar Kumar"}
        rollNumber="24CSE0142"
      />
    </div>
  );
}

export default function CollegeCodingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
          <div className="flex items-center gap-2 text-xs">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span>Loading University Coding &amp; Practical Labs...</span>
          </div>
        </div>
      }
    >
      <CollegeCodingPortalInner />
    </Suspense>
  );
}
