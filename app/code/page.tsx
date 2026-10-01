"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Eye,
  FileCode,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Terminal,
  Trophy,
  XCircle,
  Check,
  Award,
  Calendar,
  Flame,
} from "lucide-react";
import {
  LAB_COURSES,
  type LabCourse,
  type LabLecture,
  type LabMCQ,
  type LabCodingProblem,
  type LabNote,
} from "@/lib/lab-curriculum";
import type {
  CodingProblem,
  LanguageId,
  TestResult,
} from "@/lib/coding-types";
import { cn } from "@/lib/utils";

type LabId = "c" | "cpp" | "python" | "dsa";
type ItemType = "note" | "mcq" | "code";

function CodingPracticeInner() {
  const sp = useSearchParams();
  const urlLab = sp ? (sp.get("lab") as LabId) : null;
  const urlLec = sp ? sp.get("lec") : null;
  const urlItem = sp ? (sp.get("item") as ItemType) : null;

  // Selected Lab: null means Portal Overview Dashboard (Image 3)
  const [activeLabId, setActiveLabId] = useState<LabId | null>(
    urlLab && ["c", "cpp", "python", "dsa"].includes(urlLab) ? urlLab : "cpp"
  );

  const activeLab: LabCourse | null = activeLabId
    ? LAB_COURSES[activeLabId]
    : null;

  // Selected Lecture & Item within the active Lab
  const [selectedLectureId, setSelectedLectureId] = useState<string>(
    urlLec || (activeLab ? activeLab.lectures[0].id : "cpp-lec1")
  );
  const [activeItemType, setActiveItemType] = useState<ItemType>(
    urlItem && ["note", "mcq", "code"].includes(urlItem) ? urlItem : "code"
  );

  // Search filter inside lab
  const [labSearch, setLabSearch] = useState<string>("");

  // Storage states
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>("cpp");
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Execution state (Coding Problem)
  const [running, setRunning] = useState<boolean>(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"output" | "tests" | "mentor">("output");
  const [output, setOutput] = useState<string>("");
  const [errorOutput, setErrorOutput] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testsPassedCount, setTestsPassedCount] = useState<number>(0);
  const [allPassedSuccess, setAllPassedSuccess] = useState<boolean>(false);

  // AI Mentor state
  const [mentorLoading, setMentorLoading] = useState<boolean>(false);
  const [mentorResponse, setMentorResponse] = useState<string>("");

  // MCQ state for the active lecture
  const [currentMcqIndex, setCurrentMcqIndex] = useState<number>(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load completed items from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sl_lab_completed_items");
      if (raw) {
        setCompletedItems(new Set(JSON.parse(raw)));
      }
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

  // Find currently active lecture
  const currentLecture: LabLecture = useMemo(() => {
    if (!activeLab) return LAB_COURSES.cpp.lectures[0];
    const hit = activeLab.lectures.find((l) => l.id === selectedLectureId);
    return hit || activeLab.lectures[0];
  }, [activeLab, selectedLectureId]);

  // Sync default language when active lab changes
  useEffect(() => {
    if (activeLab) {
      setSelectedLanguage(activeLab.defaultLanguage);
      if (!activeLab.lectures.some((l) => l.id === selectedLectureId)) {
        setSelectedLectureId(activeLab.lectures[0].id);
      }
    }
  }, [activeLabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset MCQ answers when lecture changes
  useEffect(() => {
    setCurrentMcqIndex(0);
    setMcqAnswers({});
    setMcqSubmitted(false);
  }, [selectedLectureId]);

  // Current problem from active lecture
  const currentProblem: LabCodingProblem = currentLecture.codingProblem;

  // Code key: problemId + language
  const codeKey = `${currentProblem.id}_${selectedLanguage}`;
  const currentCode =
    userCodes[codeKey] !== undefined
      ? userCodes[codeKey]
      : currentProblem.starterCode[selectedLanguage] || "";

  const handleCodeChange = (newCode: string) => {
    setUserCodes((prev) => ({
      ...prev,
      [codeKey]: newCode,
    }));
  };

  const handleResetCode = () => {
    if (confirm("Reset code to default starter template?")) {
      handleCodeChange(currentProblem.starterCode[selectedLanguage] || "");
    }
  };

  // Run with custom input
  const runCodeCustom = async () => {
    setRunning(true);
    setActiveConsoleTab("output");
    setOutput("");
    setErrorOutput("");
    setExecutionTime(null);
    setAllPassedSuccess(false);
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
      if (data.timeMs !== undefined) {
        setExecutionTime(data.timeMs);
      }
    } catch (e) {
      setErrorOutput(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  };

  // Run all test cases (CodeTantra Workflow)
  const runAllTests = async () => {
    setRunning(true);
    setActiveConsoleTab("tests");
    setTestResults([]);
    setAllPassedSuccess(false);
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

  // Ask AI Mentor
  const askAiMentor = async (action: "hint" | "explain-error" | "review") => {
    setMentorLoading(true);
    setActiveConsoleTab("mentor");
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
      setMentorResponse(
        e instanceof Error ? e.message : "Error contacting AI mentor"
      );
    } finally {
      setMentorLoading(false);
    }
  };

  // Keyboard tab handling inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const updated = val.substring(0, start) + "    " + val.substring(end);
      handleCodeChange(updated);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Filtered lectures in sidebar
  const filteredLectures = useMemo(() => {
    if (!activeLab) return [];
    if (!labSearch.trim()) return activeLab.lectures;
    const needle = labSearch.toLowerCase();
    return activeLab.lectures.filter(
      (l) =>
        l.title.toLowerCase().includes(needle) ||
        l.description.toLowerCase().includes(needle) ||
        `lecture ${l.lectureNumber}`.includes(needle)
    );
  }, [activeLab, labSearch]);

  // Overall Lab Progress Calculation
  const labProgressPct = useMemo(() => {
    if (!activeLab) return 0;
    const totalItems = activeLab.lectures.length * 3; // note + mcq + code
    let done = 0;
    activeLab.lectures.forEach((l) => {
      if (completedItems.has(`${l.id}_note`)) done++;
      if (completedItems.has(`${l.id}_mcq`)) done++;
      if (completedItems.has(`${l.id}_code`)) done++;
    });
    return totalItems ? Math.min(100, Math.round((done / totalItems) * 100)) : 0;
  }, [activeLab, completedItems]);

  // =========================================================================
  // VIEW MODE 1: LABS PORTAL OVERVIEW (Matches Screenshot 3)
  // =========================================================================
  if (!activeLab) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header stats bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Labs &amp; Programming Portals
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Access scheduled university laboratory sessions, assessments, study guides, and hands-on CodeTantra practice.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-2.5 px-4 shadow-xs">
              <Layers className="h-4 w-4 text-indigo-600" />
              <div className="text-xs font-bold text-slate-700">
                Labs Enrolled: <span className="text-indigo-600">4</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-2.5 px-4 shadow-xs">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div className="text-xs font-bold text-slate-700">
                Badges: <span className="text-amber-600">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Labs Cards Grid (Matches Screenshot 3) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.values(LAB_COURSES) as LabCourse[]).map((course) => {
            const totalItems = course.lectures.length * 3;
            let done = 0;
            course.lectures.forEach((l) => {
              if (completedItems.has(`${l.id}_note`)) done++;
              if (completedItems.has(`${l.id}_mcq`)) done++;
              if (completedItems.has(`${l.id}_code`)) done++;
            });
            const pct = Math.round((done / totalItems) * 100);

            return (
              <div
                key={course.id}
                className="group relative rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Icon & Enrolled status */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-md text-white bg-gradient-to-br",
                        course.accentColor
                      )}
                    >
                      {course.icon}
                    </div>
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                      Enrolled
                    </span>
                  </div>

                  {/* Course Code & Name */}
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                    {course.code}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                    {course.name}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full bg-gradient-to-r",
                          course.accentColor
                        )}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata Chips (Matches Screenshot 3) */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Start Date
                      </span>
                      <span>{course.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        End Date
                      </span>
                      <span>{course.endDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Assessments
                      </span>
                      <span className="text-indigo-600 font-bold">
                        {course.totalAssessments} Tests
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Lectures
                      </span>
                      <span>{course.lectures.length} Units</span>
                    </div>
                  </div>
                </div>

                {/* Open Lab CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveLabId(course.id);
                    setSelectedLectureId(course.lectures[0].id);
                    setActiveItemType("code");
                  }}
                  className="w-full rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md"
                >
                  <span>Enter Lab Workspace</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: INSIDE LAB WORKSPACE (Matches Screenshot 1 & 2)
  // =========================================================================
  return (
    <div className="px-4 py-5 lg:px-8 max-w-[1680px] mx-auto space-y-4">
      {/* Top Banner (Matches Screenshot 1 & 2) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-indigo-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveLabId(null)}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition backdrop-blur-sm border border-white/10"
              title="Return to all courses"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Labs</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white text-lg shadow-md font-bold">
                {activeLab.icon}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {activeLab.code}
                </h1>
                <p className="text-xs text-indigo-200">
                  {activeLab.name}
                </p>
              </div>
            </div>
          </div>

          {/* Top Progress & Stats (Matches Screenshot 1 & 2) */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
              <span className="text-indigo-300 font-bold">Start:</span>
              <span>{activeLab.startDate}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
              <span className="text-indigo-300 font-bold">End:</span>
              <span>{activeLab.endDate}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
              <span className="text-indigo-300 font-bold">Tests:</span>
              <span>{activeLab.totalAssessments}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-3.5 py-1.5 font-bold shadow-md">
              <span>Progress: {labProgressPct}%</span>
            </div>
          </div>
        </div>

        {/* Global Progress Strip */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
            style={{ width: `${Math.max(3, labProgressPct)}%` }}
          />
        </div>
      </div>

      {/* Main Split Layout: Left Hierarchy vs Right Workspace */}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        {/* =========================================================================
            LEFT COLUMN: LECTURES ACCORDION (Matches Screenshot 1 & 2)
            ========================================================================= */}
        <div className="space-y-3">
          {/* Search Box in Sidebar */}
          <div className="relative rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={labSearch}
              onChange={(e) => setLabSearch(e.target.value)}
              placeholder="Search lectures, topics, questions..."
              className="w-full bg-transparent pl-8 pr-3 text-xs outline-none font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Lectures List */}
          <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1">
            {filteredLectures.map((lecture) => {
              const isSelectedLecture = lecture.id === selectedLectureId;
              const isNoteDone = completedItems.has(`${lecture.id}_note`);
              const isMcqDone = completedItems.has(`${lecture.id}_mcq`);
              const isCodeDone = completedItems.has(`${lecture.id}_code`);

              return (
                <div
                  key={lecture.id}
                  className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden"
                >
                  {/* Lecture Header Accordion Header */}
                  <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white text-[10px] font-black">
                        {lecture.lectureNumber}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        Lecture {lecture.lectureNumber}: {lecture.title}
                      </span>
                    </div>
                  </div>

                  {/* 3 Sub-items (Notes, MCQ, Coding) - Matches Screenshot 1 & 2 */}
                  <div className="p-2 space-y-1">
                    {/* Item 1: Concept Notes & Reading */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLectureId(lecture.id);
                        setActiveItemType("note");
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl p-2.5 text-xs transition flex items-center justify-between gap-2.5",
                        isSelectedLecture && activeItemType === "note"
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isSelectedLecture && activeItemType === "note"
                              ? "bg-indigo-600 ring-4 ring-indigo-100"
                              : isNoteDone
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                          )}
                        />
                        <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          1. {lecture.note.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {lecture.note.readTime}
                      </span>
                    </button>

                    {/* Item 2: MCQ Assessment */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLectureId(lecture.id);
                        setActiveItemType("mcq");
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl p-2.5 text-xs transition flex items-center justify-between gap-2.5",
                        isSelectedLecture && activeItemType === "mcq"
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isSelectedLecture && activeItemType === "mcq"
                              ? "bg-indigo-600 ring-4 ring-indigo-100"
                              : isMcqDone
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                          )}
                        />
                        <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">
                          2. {lecture.title} MCQ Assessment
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                        {lecture.mcqs.length} MCQs
                      </span>
                    </button>

                    {/* Item 3: Coding Problem (CodeTantra IDE) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLectureId(lecture.id);
                        setActiveItemType("code");
                        setOutput("");
                        setErrorOutput("");
                        setTestResults([]);
                        setAllPassedSuccess(false);
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl p-2.5 text-xs transition flex items-center justify-between gap-2.5",
                        isSelectedLecture && activeItemType === "code"
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isSelectedLecture && activeItemType === "code"
                              ? "bg-indigo-600 ring-4 ring-indigo-100"
                              : isCodeDone
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                          )}
                        />
                        <Code2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          3. {lecture.codingProblem.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                        COD
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: DYNAMIC WORKSPACE (Notes / MCQ / CodeTantra IDE)
            ========================================================================= */}
        <div className="space-y-4">
          {/* ==========================================
              SUB-VIEW 1: STUDY NOTES / DOCUMENT READER (Matches Screenshot 1 & 2)
              ========================================== */}
          {activeItemType === "note" && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-6 p-6 sm:p-8 animate-in fade-in duration-150">
              {/* Document Meta Header (Matches Screenshot 1/2) */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      Lecture {currentLecture.lectureNumber} Guide
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Read Time: {currentLecture.note.readTime}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      markItemCompleted(`${currentLecture.id}_note`);
                      setActiveItemType("mcq");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition"
                  >
                    <span>Proceed to MCQ</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-900">
                  {currentLecture.note.title}
                </h2>
              </div>

              {/* Document Information Table (Matches Screenshot 1/2) */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Document Information
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Module:</span>
                    <span className="font-semibold text-slate-800">{activeLab.shortTitle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Topic:</span>
                    <span className="font-semibold text-slate-800">{currentLecture.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Format:</span>
                    <span className="font-semibold text-slate-800">Lab Guide / PDF</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status:</span>
                    <span className="font-bold text-emerald-600">
                      {completedItems.has(`${currentLecture.id}_note`) ? "Completed ✓" : "In Progress"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formatted Guide Body */}
              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {currentLecture.note.content}
              </div>

              {/* Key Takeaways */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Key Takeaways
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-indigo-900">
                  {currentLecture.note.keyPoints.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>

              {/* Footer CTA */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <span className="text-xs text-slate-400">
                  Done studying? Test your conceptual understanding in the MCQ Assessment.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    markItemCompleted(`${currentLecture.id}_note`);
                    setActiveItemType("mcq");
                  }}
                  className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  <span>Take Lecture MCQ Test</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              SUB-VIEW 2: LECTURE MCQ ASSESSMENT
              ========================================== */}
          {activeItemType === "mcq" && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                    Lecture {currentLecture.lectureNumber} Assessment
                  </span>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    {currentLecture.title} – MCQ Assessment
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Question {currentMcqIndex + 1} of {currentLecture.mcqs.length}
                  </span>
                </div>
              </div>

              {/* MCQ Question Body */}
              {(() => {
                const mcq: LabMCQ = currentLecture.mcqs[currentMcqIndex];
                const chosen = mcqAnswers[currentMcqIndex];
                const answered = chosen !== undefined;

                return (
                  <div className="space-y-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {mcq.question}
                    </h3>

                    {mcq.codeSnippet && (
                      <pre className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                        {mcq.codeSnippet}
                      </pre>
                    )}

                    {/* Options Grid */}
                    <div className="space-y-2.5">
                      {mcq.options.map((opt, optIdx) => {
                        const isChosen = chosen === optIdx;
                        const isCorrect = optIdx === mcq.correctIndex;

                        let style = "border-slate-200 bg-slate-50/80 hover:bg-indigo-50/60 hover:border-indigo-200 text-slate-800";
                        if (answered) {
                          if (isCorrect) {
                            style = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-200";
                          } else if (isChosen) {
                            style = "border-rose-400 bg-rose-50 text-rose-950 font-bold";
                          } else {
                            style = "opacity-50 border-slate-200 bg-slate-50 text-slate-400";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={answered}
                            onClick={() => {
                              setMcqAnswers((prev) => ({
                                ...prev,
                                [currentMcqIndex]: optIdx,
                              }));
                            }}
                            className={cn(
                              "w-full text-left rounded-2xl border p-3.5 text-xs sm:text-sm transition flex items-center justify-between gap-3",
                              style
                            )}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black shadow-xs border">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>
                            {answered && isCorrect && (
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            {answered && isChosen && !isCorrect && (
                              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {answered && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950 leading-relaxed animate-in fade-in">
                        <span className="font-bold">Explanation: </span>
                        {mcq.explanation}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* MCQ Pagination / Controls */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={currentMcqIndex === 0}
                  onClick={() => setCurrentMcqIndex((prev) => prev - 1)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>

                {currentMcqIndex < currentLecture.mcqs.length - 1 ? (
                  <button
                    type="button"
                    disabled={mcqAnswers[currentMcqIndex] === undefined}
                    onClick={() => setCurrentMcqIndex((prev) => prev + 1)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={mcqAnswers[currentMcqIndex] === undefined}
                    onClick={() => {
                      markItemCompleted(`${currentLecture.id}_mcq`);
                      setActiveItemType("code");
                    }}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <span>Complete &amp; Open Coding Problem</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              SUB-VIEW 3: CODING CHALLENGE (CodeTantra IDE)
              ========================================== */}
          {activeItemType === "code" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Problem Statement Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        Lecture {currentLecture.lectureNumber} Problem
                      </span>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                          currentProblem.difficulty === "easy"
                            ? "bg-emerald-50 text-emerald-700"
                            : currentProblem.difficulty === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        )}
                      >
                        {currentProblem.difficulty}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">
                      {currentProblem.title}
                    </h2>
                  </div>

                  {completedItems.has(`${currentLecture.id}_code`) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" /> Solved &amp; Accepted ✓
                    </span>
                  )}
                </div>

                {/* Problem Description */}
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {currentProblem.description}
                </div>

                {/* I/O Format & Constraints */}
                <div className="grid gap-3 sm:grid-cols-3 rounded-2xl bg-slate-50 p-3.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Input Format: </span>
                    <span className="text-slate-600 block mt-0.5">{currentProblem.inputFormat}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Output Format: </span>
                    <span className="text-slate-600 block mt-0.5">{currentProblem.outputFormat}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Constraints: </span>
                    <code className="rounded bg-slate-200/80 px-1 py-0.2 font-mono text-[11px] block mt-0.5">
                      {currentProblem.constraints}
                    </code>
                  </div>
                </div>

                {/* Sample Case */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Sample Input (STDIN)
                    </div>
                    <pre className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-xs text-slate-900 whitespace-pre-wrap">
                      {currentProblem.sampleInput}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Sample Output (STDOUT)
                    </div>
                    <pre className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-xs text-slate-900 whitespace-pre-wrap">
                      {currentProblem.sampleOutput}
                    </pre>
                  </div>
                </div>

                {currentProblem.explanation && (
                  <p className="text-xs text-slate-500 italic">
                    💡 Explanation: {currentProblem.explanation}
                  </p>
                )}
              </div>

              {/* IDE Header Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white shadow-sm">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-300">Language:</span>
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                    {(["cpp", "python", "c"] as LanguageId[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLanguage(lang)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition",
                          selectedLanguage === lang
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        {lang === "cpp" ? "C++" : lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCode}
                    title="Reset starter template"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => askAiMentor("hint")}
                    disabled={mentorLoading}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600/90 hover:bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
                  >
                    <Sparkles className="h-3 w-3" /> Ask Mentor
                  </button>

                  <button
                    type="button"
                    onClick={runCodeCustom}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {running ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                    )}
                    Run
                  </button>

                  <button
                    type="button"
                    onClick={runAllTests}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition disabled:opacity-50"
                  >
                    {running ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Submit &amp; Test (CodeTantra)
                  </button>
                </div>
              </div>

              {/* Interactive Code Editor (Dark Mode IDE) */}
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 font-mono shadow-inner overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    solution.{selectedLanguage === "python" ? "py" : selectedLanguage === "c" ? "c" : "cpp"}
                  </span>
                  <span>Tab = 4 spaces</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={currentCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  className="w-full min-h-[380px] bg-transparent p-4 text-xs font-mono text-emerald-300 leading-relaxed outline-none resize-y selection:bg-indigo-600/50"
                  placeholder={`Write your ${selectedLanguage} code here...`}
                />
              </div>

              {/* Custom Input Toggle */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    {showCustomInput ? "Hide Custom Input (STDIN)" : "Provide Custom Input (STDIN)"}
                  </button>
                  {executionTime !== null && (
                    <span className="text-[11px] text-slate-400">
                      Execution time: {executionTime}ms
                    </span>
                  )}
                </div>

                {showCustomInput && (
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter input here (lines will be passed to stdin)..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400"
                    rows={3}
                  />
                )}
              </div>

              {/* Output / Tests / Mentor Tabs */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab("output")}
                    className={cn(
                      "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                      activeConsoleTab === "output"
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Terminal className="h-3.5 w-3.5" /> Output Console
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab("tests")}
                    className={cn(
                      "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                      activeConsoleTab === "tests"
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Test Cases (CodeTantra)
                    {testResults.length > 0 && (
                      <span
                        className={cn(
                          "ml-1 px-1.5 py-0.2 rounded-full text-[10px]",
                          testsPassedCount === testResults.length
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        )}
                      >
                        {testsPassedCount}/{testResults.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab("mentor")}
                    className={cn(
                      "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                      activeConsoleTab === "mentor"
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Mentor
                  </button>
                </div>

                <div className="p-4 min-h-[160px] max-h-[380px] overflow-y-auto space-y-3">
                  {/* Console Tab */}
                  {activeConsoleTab === "output" && (
                    <div>
                      {errorOutput && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-mono text-xs text-rose-800 whitespace-pre-wrap mb-2">
                          <div className="font-bold flex items-center gap-1 text-rose-900 mb-1">
                            <XCircle className="h-4 w-4" /> Standard Error / Diagnostics:
                          </div>
                          {errorOutput}
                        </div>
                      )}
                      {output ? (
                        <pre className="font-mono text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">
                          {output}
                        </pre>
                      ) : !errorOutput ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs">
                          <Terminal className="h-8 w-8 text-slate-300 mb-2" />
                          Click <strong>Run</strong> or <strong>Submit &amp; Test</strong> to execute your code.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Test Cases Tab */}
                  {activeConsoleTab === "tests" && (
                    <div className="space-y-3">
                      {/* Celebratory Banner */}
                      {allPassedSuccess && testResults.length > 0 && (
                        <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-white/20 p-2.5 backdrop-blur-sm">
                                <Trophy className="h-7 w-7 text-amber-300" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                                  CodeTantra Evaluation Result
                                </div>
                                <h3 className="text-lg font-black text-white">
                                  SUCCESS! All Test Cases Passed 🎉
                                </h3>
                                <p className="text-xs text-emerald-100">
                                  Accepted • 100% Score • {testResults.length}/{testResults.length} Test cases verified (including hidden test cases).
                                </p>
                              </div>
                            </div>
                            <span className="rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm border border-white/25">
                              Status: Accepted ✓
                            </span>
                          </div>
                        </div>
                      )}

                      {testResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                          <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
                          Click <strong>Submit &amp; Test (CodeTantra)</strong> to evaluate your code against test cases.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold pb-1 border-b border-slate-100">
                            <span>
                              Test Results: {testsPassedCount} of {testResults.length} Passed
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                                testsPassedCount === testResults.length
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              )}
                            >
                              {testsPassedCount === testResults.length
                                ? "All Tests Passed ✓"
                                : `${testResults.length - testsPassedCount} Tests Failed ✗`}
                            </span>
                          </div>

                          {testResults.map((tr, idx) => {
                            const matchingTc = currentProblem.testCases.find(
                              (tc) => tc.id === tr.testCaseId
                            );
                            const isSecret = Boolean(matchingTc?.isSecret);

                            return (
                              <div
                                key={tr.testCaseId || idx}
                                className={cn(
                                  "rounded-xl border p-3 text-xs flex flex-wrap items-center justify-between gap-2",
                                  tr.passed
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-rose-200 bg-rose-50/50"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {tr.passed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                  )}
                                  <span className="font-bold text-slate-800">
                                    Test Case #{idx + 1}
                                  </span>
                                  {isSecret && (
                                    <span className="rounded-md bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                                      Hidden 🔒
                                    </span>
                                  )}
                                  {tr.timeMs !== undefined && (
                                    <span className="text-[10px] text-slate-400">
                                      ({tr.timeMs}ms)
                                    </span>
                                  )}
                                </div>

                                <span className={cn("text-[11px] font-bold", tr.passed ? "text-emerald-700" : "text-rose-700")}>
                                  {tr.passed ? "PASSED ✓" : "FAILED ✗"}
                                </span>

                                {!tr.passed && (
                                  <div className="w-full mt-2 space-y-1 font-mono text-[11px] rounded-lg bg-white/70 p-2.5 border border-rose-100">
                                    {isSecret ? (
                                      <div className="text-slate-600 italic">
                                        🔒 Hidden Test Case: Input/Output are masked. Check boundary cases and edge values.
                                      </div>
                                    ) : (
                                      <>
                                        <div>
                                          <span className="text-slate-500">Expected: </span>
                                          <span className="text-emerald-700 font-bold whitespace-pre-wrap">
                                            {tr.expectedOutput}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500">Your Output: </span>
                                          <span className="text-rose-700 font-bold whitespace-pre-wrap">
                                            {tr.actualOutput || "(No output)"}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    {tr.error && (
                                      <div className="text-rose-600 pt-1 border-t border-rose-100">
                                        Error: {tr.error}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Mentor Tab */}
                  {activeConsoleTab === "mentor" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => askAiMentor("hint")}
                          disabled={mentorLoading}
                          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                        >
                          💡 Get a Hint
                        </button>
                        <button
                          type="button"
                          onClick={() => askAiMentor("explain-error")}
                          disabled={mentorLoading || !errorOutput}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          🔍 Explain My Error
                        </button>
                        <button
                          type="button"
                          onClick={() => askAiMentor("review")}
                          disabled={mentorLoading}
                          className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                        >
                          ⚡ Code Review
                        </button>
                      </div>

                      {mentorLoading ? (
                        <div className="flex items-center gap-2 text-xs text-violet-600 py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing code with Gemini AI Mentor...
                        </div>
                      ) : mentorResponse ? (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {mentorResponse}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-3">
                          Ask your AI Mentor for hints without spoiling the solution or to diagnose compilation/runtime errors.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CodingPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center p-8 text-sm text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CodingPracticeInner />
    </Suspense>
  );
}
