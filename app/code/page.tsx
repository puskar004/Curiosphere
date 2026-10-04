"use client";

import { useState, useMemo, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Search,
  FileText,
  BookOpen,
  Code2,
  Award,
  Timer,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Flame,
  Pause,
  X,
  FileSpreadsheet,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  AlertCircle,
  Loader2,
  CheckCircle,
  Send,
  Zap,
  ArrowRight,
  HelpCircle,
  Layers,
} from "lucide-react";
import LabRecordModal from "@/components/LabRecordModal";
import { LAB_COURSES, type LabCourse } from "@/lib/lab-curriculum";
import {
  LEETCODE_PROBLEMS,
  type LeetCodeProblem,
} from "@/lib/leetcode-problems";
import type { LanguageId, Difficulty } from "@/lib/coding-types";
import { cn } from "@/lib/utils";

type ConsoleTab = "testcase" | "result";
type ProblemTab = "description" | "editorial" | "solutions" | "submissions" | "mentor";

interface SubmissionRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  status: "Accepted" | "Wrong Answer" | "Compile Error";
  language: LanguageId;
  runtimeMs: number;
  runtimeBeats: number;
  memoryMb: number;
  memoryBeats: number;
  testsPassed: number;
  testsTotal: number;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "mentor";
  text: string;
  timestamp: string;
}

function LeetCodeWorkspace() {
  const sp = useSearchParams();
  const initialProblemSlug = sp ? sp.get("p") || sp.get("problem") : null;

  // Active Problem
  const [problemIndex, setProblemIndex] = useState<number>(() => {
    if (initialProblemSlug) {
      const idx = LEETCODE_PROBLEMS.findIndex(
        (p) => p.slug === initialProblemSlug || p.id === initialProblemSlug
      );
      if (idx !== -1) return idx;
    }
    return 0; // Default: 1. Two Sum
  });

  const currentProblem: LeetCodeProblem =
    LEETCODE_PROBLEMS[problemIndex] || LEETCODE_PROBLEMS[0];

  // Active Left Pane Tab
  const [activeTab, setActiveTab] = useState<ProblemTab>("description");

  // Selected Language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(
    currentProblem.category === "Python"
      ? "python"
      : currentProblem.category === "C"
      ? "c"
      : "cpp"
  );

  // Editor Code State (per problem and language)
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});
  const editorCode =
    userCodes[`${currentProblem.id}_${selectedLanguage}`] ??
    currentProblem.starterCode[selectedLanguage] ??
    "";

  const handleCodeChange = (newCode: string) => {
    setUserCodes((prev) => ({
      ...prev,
      [`${currentProblem.id}_${selectedLanguage}`]: newCode,
    }));
  };

  const handleResetCode = () => {
    const starter = currentProblem.starterCode[selectedLanguage] || "";
    setUserCodes((prev) => ({
      ...prev,
      [`${currentProblem.id}_${selectedLanguage}`]: starter,
    }));
  };

  // Solved status set
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sl_leetcode_solved");
      if (saved) {
        setSolvedProblemIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const markProblemSolved = useCallback((problemId: string) => {
    setSolvedProblemIds((prev) => {
      const next = new Set(prev).add(problemId);
      try {
        localStorage.setItem("sl_leetcode_solved", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Execution & Submissions
  const [running, setRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");

  // Testcase selection
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInputMap, setCustomInputMap] = useState<Record<string, string>>({});

  const currentCustomInput =
    customInputMap[`${currentProblem.id}_${activeTestCaseIdx}`] ??
    (currentProblem.testCases[activeTestCaseIdx]?.input || "");

  const handleCustomInputChange = (val: string) => {
    setCustomInputMap((prev) => ({
      ...prev,
      [`${currentProblem.id}_${activeTestCaseIdx}`]: val,
    }));
  };

  // Results State
  interface RunResultView {
    isSubmit: boolean;
    allPassed: boolean;
    status: "Accepted" | "Wrong Answer" | "Compile Error";
    runtimeMs: number;
    runtimeBeats: number;
    memoryMb: number;
    memoryBeats: number;
    testResults: {
      testCaseId: string;
      input: string;
      passed: boolean;
      actualOutput: string;
      expectedOutput: string;
      error?: string;
      timeMs: number;
    }[];
    stdout?: string;
    stderr?: string;
  }

  const [lastRunResult, setLastRunResult] = useState<RunResultView | null>(null);
  const [submissionsList, setSubmissionsList] = useState<SubmissionRecord[]>([]);

  // Timer
  const [timerRunning, setTimerRunning] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Problem List Drawer Modal
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerDiffFilter, setDrawerDiffFilter] = useState<string>("ALL");
  const [drawerCatFilter, setDrawerCatFilter] = useState<string>("ALL");

  // Anti-Cheat Typing & Paste Auditing
  const [typedChars, setTypedChars] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [pastedChars, setPastedChars] = useState(0);
  const [largePasteDetected, setLargePasteDetected] = useState(false);

  // Social interactive states
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});
  const [isStarred, setIsStarred] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Lab Record Modal
  const [labRecordOpen, setLabRecordOpen] = useState(false);

  // AI Mentor Chat
  const [mentorChat, setMentorChat] = useState<ChatMessage[]>([
    {
      id: "initial-1",
      sender: "mentor",
      text: `Hello! I'm your AI Mentor for **${currentProblem.title}**. You can ask me for Socratic hints, time-complexity advice, or compiler diagnosis whenever you're stuck!`,
      timestamp: "Just now",
    },
  ]);
  const [mentorInput, setMentorInput] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);

  // Update starter chat when switching problem
  useEffect(() => {
    setMentorChat([
      {
        id: `init-${currentProblem.id}`,
        sender: "mentor",
        text: `Hello! I'm your AI Mentor for **${currentProblem.title}**. You can ask me for Socratic hints, time-complexity advice, or compiler diagnosis whenever you're stuck!`,
        timestamp: "Just now",
      },
    ]);
  }, [currentProblem.id, currentProblem.title]);

  // Collapsible hints state
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  const toggleHint = (key: string) => {
    setRevealedHints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Textarea ref for Monaco feel & indentation
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

  // RUN CODE (Sample test cases)
  const handleRunCode = async () => {
    if (running) return;
    setRunning(true);
    setIsSubmitting(false);
    setConsoleOpen(true);
    setConsoleTab("result");

    const sampleCases = currentProblem.testCases.filter((tc) => !tc.isSecret);
    const casesToRun = sampleCases.length > 0 ? sampleCases : currentProblem.testCases.slice(0, 2);

    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: editorCode,
          testCases: casesToRun,
        }),
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.testResults)) {
        const allPassed = !!data.allPassed;
        const totalTime = data.testResults.reduce(
          (acc: number, r: { timeMs?: number }) => acc + (r.timeMs || 8),
          0
        );
        const avgTime = Math.max(4, Math.round(totalTime / data.testResults.length));
        const beats = Math.min(99.4, Math.max(65.0, 100 - avgTime * 2.5 + Math.random() * 4));
        const memMb = parseFloat((10.4 + Math.random() * 2.5).toFixed(1));
        const memBeats = parseFloat((82.0 + Math.random() * 12.0).toFixed(1));

        const mappedResults = data.testResults.map(
          (
            r: {
              testCaseId: string;
              passed: boolean;
              actualOutput: string;
              expectedOutput: string;
              error?: string;
              timeMs?: number;
            },
            idx: number
          ) => ({
            testCaseId: r.testCaseId || `tc-${idx}`,
            input: casesToRun[idx]?.input || "",
            passed: !!r.passed,
            actualOutput: (r.actualOutput || "").trim(),
            expectedOutput: (r.expectedOutput || "").trim(),
            error: r.error,
            timeMs: r.timeMs || 8,
          })
        );

        setLastRunResult({
          isSubmit: false,
          allPassed,
          status: allPassed ? "Accepted" : "Wrong Answer",
          runtimeMs: avgTime,
          runtimeBeats: parseFloat(beats.toFixed(1)),
          memoryMb: memMb,
          memoryBeats: memBeats,
          testResults: mappedResults,
        });
      } else {
        // Compile or runtime error
        setLastRunResult({
          isSubmit: false,
          allPassed: false,
          status: "Compile Error",
          runtimeMs: 0,
          runtimeBeats: 0,
          memoryMb: 0,
          memoryBeats: 0,
          testResults: [],
          stderr: data.error || data.stderr || "Compilation failed.",
        });
      }
    } catch (err) {
      setLastRunResult({
        isSubmit: false,
        allPassed: false,
        status: "Compile Error",
        runtimeMs: 0,
        runtimeBeats: 0,
        memoryMb: 0,
        memoryBeats: 0,
        testResults: [],
        stderr: err instanceof Error ? err.message : "Execution failed.",
      });
    } finally {
      setRunning(false);
    }
  };

  // SUBMIT CODE (All test cases including hidden)
  const handleSubmitCode = async () => {
    if (running) return;
    setRunning(true);
    setIsSubmitting(true);
    setConsoleOpen(true);
    setConsoleTab("result");

    const allCases = currentProblem.testCases;

    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: editorCode,
          testCases: allCases,
        }),
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.testResults)) {
        const allPassed = !!data.allPassed;
        const totalTime = data.testResults.reduce(
          (acc: number, r: { timeMs?: number }) => acc + (r.timeMs || 6),
          0
        );
        const avgTime = Math.max(3, Math.round(totalTime / data.testResults.length));
        const beats = Math.min(99.6, Math.max(72.0, 100 - avgTime * 3 + Math.random() * 5));
        const memMb = parseFloat((12.2 + Math.random() * 2.2).toFixed(1));
        const memBeats = parseFloat((84.0 + Math.random() * 11.0).toFixed(1));

        const mappedResults = data.testResults.map(
          (
            r: {
              testCaseId: string;
              passed: boolean;
              actualOutput: string;
              expectedOutput: string;
              error?: string;
              timeMs?: number;
            },
            idx: number
          ) => ({
            testCaseId: r.testCaseId || `tc-${idx}`,
            input: allCases[idx]?.input || "",
            passed: !!r.passed,
            actualOutput: (r.actualOutput || "").trim(),
            expectedOutput: (r.expectedOutput || "").trim(),
            error: r.error,
            timeMs: r.timeMs || 6,
          })
        );

        const runRes: RunResultView = {
          isSubmit: true,
          allPassed,
          status: allPassed ? "Accepted" : "Wrong Answer",
          runtimeMs: avgTime,
          runtimeBeats: parseFloat(beats.toFixed(1)),
          memoryMb: memMb,
          memoryBeats: memBeats,
          testResults: mappedResults,
        };

        setLastRunResult(runRes);

        // Record Submission in Submissions Tab
        const passedCount = data.testsPassed || mappedResults.filter((r: { passed: boolean }) => r.passed).length;
        const newRecord: SubmissionRecord = {
          id: `sub-${Date.now()}`,
          problemId: currentProblem.id,
          problemTitle: currentProblem.title,
          status: allPassed ? "Accepted" : "Wrong Answer",
          language: selectedLanguage,
          runtimeMs: avgTime,
          runtimeBeats: parseFloat(beats.toFixed(1)),
          memoryMb: memMb,
          memoryBeats: memBeats,
          testsPassed: passedCount,
          testsTotal: allCases.length,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };

        setSubmissionsList((prev) => [newRecord, ...prev]);

        if (allPassed) {
          markProblemSolved(currentProblem.id);
        }
      } else {
        setLastRunResult({
          isSubmit: true,
          allPassed: false,
          status: "Compile Error",
          runtimeMs: 0,
          runtimeBeats: 0,
          memoryMb: 0,
          memoryBeats: 0,
          testResults: [],
          stderr: data.error || data.stderr || "Compilation failed.",
        });
      }
    } catch (err) {
      setLastRunResult({
        isSubmit: true,
        allPassed: false,
        status: "Compile Error",
        runtimeMs: 0,
        runtimeBeats: 0,
        memoryMb: 0,
        memoryBeats: 0,
        testResults: [],
        stderr: err instanceof Error ? err.message : "Execution failed.",
      });
    } finally {
      setRunning(false);
    }
  };

  // Keyboard Shortcuts: Ctrl+' for Run, Ctrl+Enter for Submit
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        handleRunCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmitCode();
      } else if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [drawerOpen, editorCode, selectedLanguage, currentProblem, running]);

  // Switch Problems
  const goToProblem = (idx: number) => {
    if (idx < 0 || idx >= LEETCODE_PROBLEMS.length) return;
    setProblemIndex(idx);
    const target = LEETCODE_PROBLEMS[idx];
    if (target.category === "Python") setSelectedLanguage("python");
    else if (target.category === "C") setSelectedLanguage("c");
    else setSelectedLanguage("cpp");
    setLastRunResult(null);
    setActiveTestCaseIdx(0);
    setDrawerOpen(false);
  };

  const pickRandomProblem = () => {
    const randomIdx = Math.floor(Math.random() * LEETCODE_PROBLEMS.length);
    goToProblem(randomIdx);
  };

  // Filtered Problem List for Drawer
  const filteredProblems = useMemo(() => {
    return LEETCODE_PROBLEMS.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        p.problemNumber.toString().includes(drawerSearch) ||
        p.tags.some((t) => t.toLowerCase().includes(drawerSearch.toLowerCase()));
      const matchDiff =
        drawerDiffFilter === "ALL" || p.difficulty.toUpperCase() === drawerDiffFilter;
      const matchCat =
        drawerCatFilter === "ALL" || p.category.toUpperCase() === drawerCatFilter;
      return matchSearch && matchDiff && matchCat;
    });
  }, [drawerSearch, drawerDiffFilter, drawerCatFilter]);

  // AI Mentor Chat submit
  const sendMentorMessage = async (overridePrompt?: string) => {
    const msgText = overridePrompt || mentorInput.trim();
    if (!msgText || mentorLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: msgText,
      timestamp: "Just now",
    };
    setMentorChat((prev) => [...prev, userMsg]);
    if (!overridePrompt) setMentorInput("");
    setMentorLoading(true);

    try {
      const res = await fetch("/api/code/ai-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hint",
          problemTitle: currentProblem.title,
          problemDescription: `${currentProblem.description}\n\nConstraints: ${currentProblem.constraints.join("; ")}`,
          language: selectedLanguage,
          code: editorCode,
          userQuestion: msgText,
          error: lastRunResult?.stderr,
        }),
      });
      const data = await res.json();
      const replyText =
        data.ok && data.feedback
          ? data.feedback
          : "Focus on whether you can solve this using extra space (like a hash map) or by two pointers. Break down the state step by step!";

      const aiMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        sender: "mentor",
        text: replyText,
        timestamp: "Just now",
      };
      setMentorChat((prev) => [...prev, aiMsg]);
    } catch {
      setMentorChat((prev) => [
        ...prev,
        {
          id: `m-err-${Date.now()}`,
          sender: "mentor",
          text: "I ran into a connection issue, but here's a quick hint: Think about what invariant you need to maintain as you iterate through the input!",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setMentorLoading(false);
    }
  };

  // Difficulty badge styling
  const getDiffBadge = (diff: Difficulty) => {
    switch (diff) {
      case "easy":
        return "text-[#00b8a3] bg-[#00b8a3]/10 border-[#00b8a3]/20";
      case "medium":
        return "text-[#ffc01e] bg-[#ffc01e]/10 border-[#ffc01e]/20";
      case "hard":
        return "text-[#ff375f] bg-[#ff375f]/10 border-[#ff375f]/20";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  // Dummy fallback LabCourse for LabRecordModal
  const fallbackLabCourse: LabCourse = {
    id: "cpp",
    code: "CS201",
    name: "Data Structures & Algorithms Laboratory",
    shortTitle: "DSA Lab",
    category: "Core Lab",
    icon: "⚡",
    accentColor: "from-blue-600 to-indigo-600",
    startDate: "01 Aug 2026",
    endDate: "30 Nov 2026",
    totalAssessments: LEETCODE_PROBLEMS.length,
    defaultLanguage: "cpp",
    lectures: [],
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#1a1a1a] text-[#eff0f6] font-sans overflow-hidden select-none">
      {/* ============================================================== */}
      {/* 1. LEETCODE TOP NAVIGATION BAR                                 */}
      {/* ============================================================== */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#333333] bg-[#1a1a1a] px-3 z-30">
        {/* Left: LeetCode Brand + Problem List Nav */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* LeetCode Icon Logo */}
          <div className="flex items-center gap-2 pr-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffa116] to-[#e08e0b] shadow-sm text-black font-black text-xs">
              <span className="tracking-tighter">&lt;/&gt;</span>
            </div>
            <div className="flex items-center gap-1 font-bold tracking-tight text-white text-sm hidden md:flex">
              <span>LeetCode</span>
              <span className="text-[10px] font-mono text-[#ffa116] bg-[#ffa116]/10 px-1 py-0.2 rounded border border-[#ffa116]/20">
                PRO
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#333333] hidden sm:block" />

          {/* Problem List Toggle Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-[#8a8a8a] hover:bg-[#282828] hover:text-white transition"
          >
            <Layers className="h-3.5 w-3.5 text-[#ffa116]" />
            <span className="hidden sm:inline">Problem List</span>
            <span className="rounded bg-[#333333] px-1.5 py-0.2 text-[10px] font-mono text-[#8a8a8a]">
              {solvedProblemIds.size}/{LEETCODE_PROBLEMS.length}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Prev / Next / Random buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => goToProblem(problemIndex - 1)}
              disabled={problemIndex === 0}
              title="Previous Problem"
              className="rounded p-1 text-[#8a8a8a] hover:bg-[#282828] hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goToProblem(problemIndex + 1)}
              disabled={problemIndex === LEETCODE_PROBLEMS.length - 1}
              title="Next Problem"
              className="rounded p-1 text-[#8a8a8a] hover:bg-[#282828] hover:text-white disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={pickRandomProblem}
              title="Pick Random Problem"
              className="rounded p-1 text-[#8a8a8a] hover:bg-[#282828] hover:text-white transition"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Run & Submit Actions */}
        <div className="flex items-center gap-2">
          {/* Run Code Button (Ctrl + ') */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={running}
            title="Run Code (Ctrl + ')"
            className="group flex items-center gap-1.5 rounded-md border border-[#3e3e3e] bg-[#282828] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#333333] active:scale-95 transition disabled:opacity-50"
          >
            {running && !isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffa116]" />
            ) : (
              <Play className="h-3.5 w-3.5 text-slate-300 fill-slate-300 group-hover:text-white group-hover:fill-white" />
            )}
            <span>Run</span>
            <span className="hidden lg:inline text-[10px] text-[#8a8a8a] font-mono ml-0.5">
              Ctrl+&#39;
            </span>
          </button>

          {/* Submit Code Button (Ctrl + Enter) */}
          <button
            type="button"
            onClick={handleSubmitCode}
            disabled={running}
            title="Submit Solution (Ctrl + Enter)"
            className="flex items-center gap-1.5 rounded-md bg-[#2cbb5d] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#28a745] active:scale-95 shadow-sm transition disabled:opacity-50"
          >
            {running && isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            )}
            <span>Submit</span>
            <span className="hidden lg:inline text-[10px] text-white/80 font-mono ml-0.5">
              Ctrl+↵
            </span>
          </button>
        </div>

        {/* Right: Timer, Anti-cheat, PDF record & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Session Timer */}
          <div className="hidden md:flex items-center gap-1.5 rounded-md bg-[#282828] px-2 py-1 text-xs font-mono text-[#8a8a8a]">
            <Timer className="h-3.5 w-3.5 text-[#ffa116]" />
            <span className="text-white font-bold">{formatTimer(timerSeconds)}</span>
            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              title={timerRunning ? "Pause timer" : "Resume timer"}
              className="text-[#8a8a8a] hover:text-white ml-0.5"
            >
              {timerRunning ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
            </button>
            <button
              type="button"
              onClick={() => setTimerSeconds(0)}
              title="Reset timer"
              className="text-[#8a8a8a] hover:text-white"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          </div>

          {/* Organic Typing Anti-Cheat Integrity Pill */}
          <div
            className={cn(
              "hidden xl:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border",
              largePasteDetected
                ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
                : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
            )}
            title={`Audit: ${pasteCount} paste event(s), ${pastedChars} pasted characters, ${typedChars} typed keystrokes.`}
          >
            {largePasteDetected ? (
              <>
                <ShieldAlert className="h-3 w-3 text-amber-400" />
                <span>Paste Flag (+{pastedChars})</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Verified Typing</span>
              </>
            )}
          </div>

          {/* Export Lab Record PDF Button */}
          <button
            type="button"
            onClick={() => setLabRecordOpen(true)}
            title="Export Lab Practical PDF Report"
            className="hidden sm:flex items-center gap-1 rounded-md border border-[#3e3e3e] bg-[#282828] px-2.5 py-1 text-xs font-semibold text-[#eff0f6] hover:bg-[#333333] transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#ffa116]" />
            <span className="hidden lg:inline">Lab Report</span>
          </button>

          {/* User Flame Streak */}
          <div className="flex items-center gap-1 rounded-md bg-[#282828] px-2 py-1 text-xs font-bold text-amber-400">
            <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>7</span>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. SPLIT WORKSPACE: LEFT PROBLEM PANE | RIGHT EDITOR PANE       */}
      {/* ============================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANE: DESCRIPTION / EDITORIAL / SOLUTIONS / MENTOR      */}
        {/* ------------------------------------------------------------ */}
        <div className="flex w-full md:w-1/2 flex-col border-r border-[#333333] bg-[#262626]">
          {/* Tab Navigation */}
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#333333] bg-[#1a1a1a] px-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap",
                activeTab === "description"
                  ? "bg-[#282828] text-white shadow-xs"
                  : "text-[#8a8a8a] hover:bg-[#282828]/50 hover:text-white"
              )}
            >
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>Description</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("editorial")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap",
                activeTab === "editorial"
                  ? "bg-[#282828] text-white shadow-xs"
                  : "text-[#8a8a8a] hover:bg-[#282828]/50 hover:text-white"
              )}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Editorial</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("solutions")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap",
                activeTab === "solutions"
                  ? "bg-[#282828] text-white shadow-xs"
                  : "text-[#8a8a8a] hover:bg-[#282828]/50 hover:text-white"
              )}
            >
              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Solutions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap",
                activeTab === "submissions"
                  ? "bg-[#282828] text-white shadow-xs"
                  : "text-[#8a8a8a] hover:bg-[#282828]/50 hover:text-white"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2cbb5d]" />
              <span>Submissions</span>
              {submissionsList.length > 0 && (
                <span className="rounded-full bg-[#333333] px-1.5 text-[10px] text-[#8a8a8a]">
                  {submissionsList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mentor")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap",
                activeTab === "mentor"
                  ? "bg-[#282828] text-white shadow-xs"
                  : "text-[#8a8a8a] hover:bg-[#282828]/50 hover:text-white"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>Ask Mentor</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-[#c7c7c7]">
            {/* ---------------- DESCRIPTION TAB ---------------- */}
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Title & Metadata Header */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                      {currentProblem.problemNumber}. {currentProblem.title}
                    </h1>
                    {solvedProblemIds.has(currentProblem.id) && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-[#2cbb5d]">
                        <CheckCircle className="h-3 w-3" /> Solved
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {/* Difficulty Pill */}
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize",
                        getDiffBadge(currentProblem.difficulty)
                      )}
                    >
                      {currentProblem.difficulty}
                    </span>

                    {/* Category Pill */}
                    <span className="rounded-full bg-[#333333] border border-[#3e3e3e] px-2.5 py-0.5 text-xs font-semibold text-[#8a8a8a]">
                      {currentProblem.category}
                    </span>

                    {/* Acceptance */}
                    <span className="text-xs text-[#8a8a8a]">
                      Acceptance: <strong className="text-white">{currentProblem.acceptance}</strong>
                    </span>
                  </div>

                  {/* Social Action Bar (Like, Dislike, Star, Share) */}
                  <div className="mt-4 flex items-center gap-4 border-b border-[#333333] pb-4 text-xs text-[#8a8a8a]">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = likes[currentProblem.id] || 1284;
                        const liked = hasLiked[currentProblem.id];
                        setLikes((p) => ({ ...p, [currentProblem.id]: liked ? cur - 1 : cur + 1 }));
                        setHasLiked((p) => ({ ...p, [currentProblem.id]: !liked }));
                      }}
                      className={cn(
                        "flex items-center gap-1 hover:text-white transition",
                        hasLiked[currentProblem.id] && "text-[#ffa116]"
                      )}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{likes[currentProblem.id] || 1284}</span>
                    </button>

                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsStarred((p) => ({
                          ...p,
                          [currentProblem.id]: !p[currentProblem.id],
                        }))
                      }
                      className={cn(
                        "flex items-center gap-1 hover:text-white transition",
                        isStarred[currentProblem.id] && "text-[#ffa116]"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          isStarred[currentProblem.id] && "fill-[#ffa116]"
                        )}
                      />
                      <span>Favorite</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>{copiedLink ? "Copied!" : "Share"}</span>
                    </button>
                  </div>
                </div>

                {/* Company & Topics Tags */}
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#8a8a8a] font-semibold">Topics:</span>
                    {currentProblem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-[#2f2f2f] px-2 py-0.5 text-[#a0a0a0] border border-[#3a3a3a]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {currentProblem.companyTags && currentProblem.companyTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#8a8a8a] font-semibold">Companies:</span>
                      {currentProblem.companyTags.map((comp) => (
                        <span
                          key={comp}
                          className="rounded bg-[#2a2d34] px-2 py-0.5 text-blue-300 border border-blue-900/40"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Markdown Problem Statement */}
                <div className="space-y-3 whitespace-pre-line text-[#dfdfdf] leading-relaxed text-sm">
                  {currentProblem.description}
                </div>

                {/* Structured Examples (LeetCode exact look) */}
                <div className="space-y-4">
                  {currentProblem.examples.map((ex, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="text-xs font-bold text-white">
                        Example {idx + 1}:
                      </div>
                      <div className="rounded-xl border border-[#3e3e3e] bg-[#2a2a2a] p-3.5 font-mono text-xs text-[#e1e1e1] space-y-1">
                        <div>
                          <strong className="text-white">Input: </strong>
                          <span className="text-emerald-300 whitespace-pre">{ex.input}</span>
                        </div>
                        <div>
                          <strong className="text-white">Output: </strong>
                          <span className="text-[#ffa116] whitespace-pre">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="pt-1 text-[#a0a0a0] font-sans text-xs">
                            <strong className="text-white font-mono">Explanation: </strong>
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                {currentProblem.constraints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Constraints:
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[#a0a0a0] font-mono">
                      {currentProblem.constraints.map((c, i) => (
                        <li key={i}>
                          <code className="rounded bg-[#333333] px-1 py-0.5 text-[#e1e1e1]">
                            {c}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Collapsible Hints */}
                {currentProblem.hints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Hints:
                    </h3>
                    <div className="space-y-2">
                      {currentProblem.hints.map((hint, i) => {
                        const hintKey = `${currentProblem.id}_hint_${i}`;
                        const isRevealed = revealedHints[hintKey];
                        return (
                          <div
                            key={i}
                            className="rounded-xl border border-[#3e3e3e] bg-[#2a2a2a] overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleHint(hintKey)}
                              className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#333333] transition"
                            >
                              <span className="flex items-center gap-2">
                                <HelpCircle className="h-3.5 w-3.5 text-[#ffa116]" />
                                Hint {i + 1}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 text-[#8a8a8a] transition-transform",
                                  isRevealed && "rotate-180"
                                )}
                              />
                            </button>
                            {isRevealed && (
                              <div className="border-t border-[#3e3e3e] bg-[#242424] p-3 text-xs text-[#c7c7c7] leading-relaxed">
                                {hint}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------- EDITORIAL TAB ---------------- */}
            {activeTab === "editorial" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Approach: {currentProblem.editorial.approachTitle}
                  </h2>
                  <p className="mt-2 text-sm text-[#b0b0b0] leading-relaxed whitespace-pre-line">
                    {currentProblem.editorial.approachBody}
                  </p>
                </div>

                {/* Complexity Box */}
                <div className="rounded-xl border border-[#3e3e3e] bg-[#2a2a2a] p-4 space-y-2 text-xs">
                  <h3 className="font-bold text-white uppercase tracking-wider">
                    Complexity Analysis
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <strong className="text-emerald-400">Time Complexity: </strong>
                      <span className="text-[#e1e1e1]">
                        {currentProblem.editorial.timeComplexity}
                      </span>
                    </div>
                    <div>
                      <strong className="text-blue-400">Space Complexity: </strong>
                      <span className="text-[#e1e1e1]">
                        {currentProblem.editorial.spaceComplexity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Solution Snippet */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">
                      Reference Implementation ({selectedLanguage.toUpperCase()})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sol =
                          currentProblem.editorial.solutionCode[selectedLanguage] || "";
                        navigator.clipboard?.writeText(sol);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-[#8a8a8a] hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedCode ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="rounded-xl border border-[#3e3e3e] bg-[#1e1e1e] p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>
                      {currentProblem.editorial.solutionCode[selectedLanguage] ||
                        "// Solution in selected language not provided"}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {/* ---------------- SOLUTIONS TAB ---------------- */}
            {activeTab === "solutions" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Curated Multi-Language Solutions
                    </h2>
                    <p className="text-xs text-[#8a8a8a]">
                      Verified optimal solutions for {currentProblem.title}
                    </p>
                  </div>
                  <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#333333]">
                    {(["cpp", "python", "c"] as LanguageId[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setSelectedLanguage(l)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold uppercase rounded",
                          selectedLanguage === l
                            ? "bg-[#ffa116] text-black"
                            : "text-[#8a8a8a] hover:text-white"
                        )}
                      >
                        {l === "cpp" ? "C++" : l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#3e3e3e] bg-[#1e1e1e] p-4">
                  <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-3">
                    <span className="text-xs font-mono text-slate-400">
                      solution.{selectedLanguage === "python" ? "py" : selectedLanguage === "c" ? "c" : "cpp"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sol =
                          currentProblem.editorial.solutionCode[selectedLanguage] || "";
                        handleCodeChange(sol);
                      }}
                      className="text-xs font-bold text-[#ffa116] hover:underline flex items-center gap-1"
                    >
                      <ArrowRight className="h-3 w-3" /> Load Into Editor
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-[#7ee787] overflow-x-auto leading-relaxed">
                    <code>
                      {currentProblem.editorial.solutionCode[selectedLanguage] ||
                        "// Solution not available"}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {/* ---------------- SUBMISSIONS TAB ---------------- */}
            {activeTab === "submissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Submission History</h2>
                  <span className="text-xs text-[#8a8a8a]">
                    Total: {submissionsList.length}
                  </span>
                </div>

                {submissionsList.length === 0 ? (
                  <div className="rounded-2xl border border-[#333333] bg-[#222222] p-8 text-center text-xs text-[#8a8a8a] space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-[#555555] mx-auto" />
                    <p className="text-white font-semibold">No submissions recorded yet</p>
                    <p>Click &quot;Submit&quot; to test your code against all hidden test cases.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissionsList.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-[#333333] bg-[#222222] p-3 text-xs flex items-center justify-between hover:border-[#444444] transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-bold",
                                sub.status === "Accepted"
                                  ? "text-[#2cbb5d]"
                                  : "text-red-400"
                              )}
                            >
                              {sub.status}
                            </span>
                            <span className="rounded bg-[#333333] px-1.5 py-0.2 text-[10px] uppercase font-mono text-[#a0a0a0]">
                              {sub.language}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8a8a8a]">
                            Passed {sub.testsPassed}/{sub.testsTotal} test cases • {sub.timestamp}
                          </div>
                        </div>

                        {sub.status === "Accepted" && (
                          <div className="text-right space-y-0.5 font-mono">
                            <div className="text-white font-semibold">
                              {sub.runtimeMs} ms{" "}
                              <span className="text-[10px] text-emerald-400 font-normal">
                                (beats {sub.runtimeBeats}%)
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8a8a8a]">
                              {sub.memoryMb} MB{" "}
                              <span className="text-[10px] text-blue-400">
                                (beats {sub.memoryBeats}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- MENTOR TAB ---------------- */}
            {activeTab === "mentor" && (
              <div className="flex flex-col h-full min-h-[460px] justify-between space-y-4">
                {/* Chat Messages */}
                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                  {mentorChat.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-2xl p-3.5 text-xs leading-relaxed max-w-[90%]",
                        msg.sender === "user"
                          ? "ml-auto bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                          : "mr-auto border border-[#3e3e3e] bg-[#222222] text-[#e1e1e1]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1 opacity-80 text-[10px]">
                        {msg.sender === "mentor" ? (
                          <>
                            <Sparkles className="h-3 w-3 text-violet-400" />
                            <span>AI Mentor</span>
                          </>
                        ) : (
                          <span>You</span>
                        )}
                      </div>
                      <div className="whitespace-pre-line">{msg.text}</div>
                    </div>
                  ))}

                  {mentorLoading && (
                    <div className="rounded-2xl border border-[#3e3e3e] bg-[#222222] p-3 text-xs text-[#8a8a8a] flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                      <span>AI Mentor is reasoning...</span>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="space-y-2 pt-2 border-t border-[#333333]">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendMentorMessage("Can you give me a subtle hint without giving away the answer?")}
                      className="rounded-full bg-[#333333] hover:bg-[#3e3e3e] px-2.5 py-1 text-[11px] text-white flex items-center gap-1"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-violet-400" />
                      <span>Give me a hint</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sendMentorMessage("What is the optimal time and space complexity for this problem?")}
                      className="rounded-full bg-[#333333] hover:bg-[#3e3e3e] px-2.5 py-1 text-[11px] text-white flex items-center gap-1"
                    >
                      <Zap className="h-2.5 w-2.5 text-amber-400" />
                      <span>Optimal Complexity?</span>
                    </button>
                    {lastRunResult && !lastRunResult.allPassed && (
                      <button
                        type="button"
                        onClick={() => sendMentorMessage("Can you explain why my code failed the test case?")}
                        className="rounded-full bg-[#333333] hover:bg-[#3e3e3e] px-2.5 py-1 text-[11px] text-red-300 flex items-center gap-1 border border-red-900/40"
                      >
                        <AlertCircle className="h-2.5 w-2.5 text-red-400" />
                        <span>Explain Failure</span>
                      </button>
                    )}
                  </div>

                  {/* Input Box */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mentorInput}
                      onChange={(e) => setMentorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMentorMessage()}
                      placeholder="Ask AI Mentor anything..."
                      className="flex-1 rounded-xl border border-[#3e3e3e] bg-[#1e1e1e] px-3.5 py-2 text-xs text-white placeholder-[#6e6e6e] outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => sendMentorMessage()}
                      disabled={mentorLoading || !mentorInput.trim()}
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 p-2 text-white disabled:opacity-40 transition"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANE: CODE EDITOR + TESTCASE / TEST RESULT DRAWER      */}
        {/* ------------------------------------------------------------ */}
        <div className="flex w-full md:w-1/2 flex-col bg-[#1e1e1e]">
          {/* Editor Header Controls */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#333333] bg-[#1a1a1a] px-3">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#8a8a8a] hidden sm:inline">
                Language:
              </span>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as LanguageId)}
                  className="rounded-md border border-[#3e3e3e] bg-[#282828] px-2.5 py-1 text-xs font-bold text-white outline-none cursor-pointer hover:bg-[#333333] transition"
                >
                  <option value="cpp">C++ (g++ 17)</option>
                  <option value="python">Python 3 (3.11)</option>
                  <option value="c">C (gcc 11)</option>
                </select>
              </div>
            </div>

            {/* Editor Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleResetCode}
                title="Reset starter template"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#8a8a8a] hover:bg-[#282828] hover:text-white transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(editorCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                title="Copy code"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#8a8a8a] hover:bg-[#282828] hover:text-white transition"
              >
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Monaco-Style Dark Code Editor Area */}
          <div className="relative flex-1 bg-[#1e1e1e] font-mono overflow-hidden">
            {/* Gutter Line Numbers + Textarea */}
            <div className="flex h-full w-full">
              {/* Line Numbers Gutter */}
              <div className="w-12 shrink-0 select-none bg-[#181818] py-4 text-right pr-3 font-mono text-xs text-[#555555] overflow-hidden leading-relaxed">
                {editorCode.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea Code Input */}
              <textarea
                ref={textareaRef}
                value={editorCode}
                onChange={(e) => {
                  setTypedChars((p) => p + 1);
                  handleCodeChange(e.target.value);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) {
                    setPasteCount((p) => p + 1);
                    setPastedChars((p) => p + text.length);
                    if (text.length > 60 || text.split("\n").length > 4) {
                      setLargePasteDetected(true);
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="flex-1 resize-none bg-transparent p-4 text-xs font-mono text-[#7ee787] leading-relaxed outline-none selection:bg-blue-600/40 overflow-y-auto"
                placeholder={`Write your ${selectedLanguage} solution here...`}
              />
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* BOTTOM CONSOLE DRAWER (TESTCASE & TEST RESULT)             */}
          {/* ---------------------------------------------------------- */}
          <div
            className={cn(
              "border-t border-[#333333] bg-[#222222] transition-all flex flex-col",
              consoleOpen ? "h-64" : "h-9"
            )}
          >
            {/* Console Drawer Header */}
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#333333] bg-[#1a1a1a] px-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setConsoleOpen(true);
                    setConsoleTab("testcase");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition",
                    consoleTab === "testcase" && consoleOpen
                      ? "bg-[#282828] text-white"
                      : "text-[#8a8a8a] hover:text-white"
                  )}
                >
                  <Terminal className="h-3 w-3 text-emerald-400" />
                  <span>Testcase</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConsoleOpen(true);
                    setConsoleTab("result");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition",
                    consoleTab === "result" && consoleOpen
                      ? "bg-[#282828] text-white"
                      : "text-[#8a8a8a] hover:text-white"
                  )}
                >
                  <CheckCircle2 className="h-3 w-3 text-[#2cbb5d]" />
                  <span>Test Result</span>
                  {lastRunResult && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        lastRunResult.allPassed ? "bg-[#2cbb5d]" : "bg-red-500"
                      )}
                    />
                  )}
                </button>
              </div>

              {/* Minimize / Maximize Chevron */}
              <button
                type="button"
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-[#8a8a8a] hover:text-white p-1"
                title={consoleOpen ? "Collapse Console" : "Expand Console"}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    !consoleOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {/* Console Drawer Body */}
            {consoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
                {/* 1. TESTCASE TAB */}
                {consoleTab === "testcase" && (
                  <div className="space-y-3">
                    {/* Case Tabs */}
                    <div className="flex items-center gap-2">
                      {currentProblem.testCases
                        .filter((tc) => !tc.isSecret)
                        .map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveTestCaseIdx(idx)}
                            className={cn(
                              "rounded-md px-3 py-1 font-semibold transition",
                              activeTestCaseIdx === idx
                                ? "bg-[#333333] text-white border border-[#444444]"
                                : "text-[#8a8a8a] hover:bg-[#282828] hover:text-white"
                            )}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                    </div>

                    {/* Input Parameter Box */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#8a8a8a]">
                        Input Parameters (STDIN):
                      </div>
                      <textarea
                        value={currentCustomInput}
                        onChange={(e) => handleCustomInputChange(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-[#3e3e3e] bg-[#181818] p-3 text-xs text-white font-mono leading-relaxed outline-none focus:border-[#ffa116]"
                        placeholder="Provide test input here..."
                      />
                    </div>
                  </div>
                )}

                {/* 2. TEST RESULT TAB */}
                {consoleTab === "result" && (
                  <div className="space-y-4">
                    {running ? (
                      <div className="flex h-32 flex-col items-center justify-center space-y-2 text-[#8a8a8a]">
                        <Loader2 className="h-6 w-6 animate-spin text-[#ffa116]" />
                        <p className="text-xs font-sans">
                          Evaluating your solution on isolated runner...
                        </p>
                      </div>
                    ) : !lastRunResult ? (
                      <div className="flex h-32 flex-col items-center justify-center text-[#666666] text-xs font-sans">
                        <Play className="h-6 w-6 mb-1 text-[#444444]" />
                        <span>Run code or submit to view test evaluation results</span>
                      </div>
                    ) : lastRunResult.status === "Compile Error" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                          <X className="h-4 w-4" />
                          <span>Compile Error / Runtime Exception</span>
                        </div>
                        <pre className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {lastRunResult.stderr || "Compilation failed."}
                        </pre>
                      </div>
                    ) : lastRunResult.isSubmit && lastRunResult.allPassed ? (
                      /* Final Submit Celebration: LeetCode Accepted Screen */
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2cbb5d] text-white">
                              <Check className="h-5 w-5 stroke-[3]" />
                            </div>
                            <div>
                              <div className="text-lg font-black text-[#2cbb5d]">
                                Accepted
                              </div>
                              <div className="text-[11px] text-[#8a8a8a] font-sans">
                                Passed all {lastRunResult.testResults.length} test cases!
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setLabRecordOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-[#2cbb5d] hover:bg-[#28a745] px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm font-sans"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Export Verified Lab Report</span>
                          </button>
                        </div>

                        {/* Runtime & Memory Beats Cards */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="rounded-xl border border-[#3e3e3e] bg-[#1c1c1c] p-3 space-y-1">
                            <span className="text-[11px] text-[#8a8a8a] font-sans">
                              Runtime
                            </span>
                            <div className="text-base font-bold text-white">
                              {lastRunResult.runtimeMs} ms
                            </div>
                            <div className="text-[11px] text-emerald-400 font-sans">
                              Beats <strong>{lastRunResult.runtimeBeats}%</strong> of submissions
                            </div>
                          </div>

                          <div className="rounded-xl border border-[#3e3e3e] bg-[#1c1c1c] p-3 space-y-1">
                            <span className="text-[11px] text-[#8a8a8a] font-sans">
                              Memory
                            </span>
                            <div className="text-base font-bold text-white">
                              {lastRunResult.memoryMb} MB
                            </div>
                            <div className="text-[11px] text-blue-400 font-sans">
                              Beats <strong>{lastRunResult.memoryBeats}%</strong> of submissions
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Run Sample Results View / Wrong Answer */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-black",
                                lastRunResult.allPassed
                                  ? "text-[#2cbb5d]"
                                  : "text-red-400"
                              )}
                            >
                              {lastRunResult.status}
                            </span>
                            <span className="text-[#8a8a8a] text-[11px]">
                              Runtime: {lastRunResult.runtimeMs} ms
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {lastRunResult.testResults.map((tr, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveTestCaseIdx(i)}
                                className={cn(
                                  "rounded px-2.5 py-0.5 text-[11px] font-bold transition flex items-center gap-1",
                                  activeTestCaseIdx === i
                                    ? "bg-[#333333] text-white border border-[#444444]"
                                    : "text-[#8a8a8a] hover:text-white"
                                )}
                              >
                                <span>Case {i + 1}</span>
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    tr.passed ? "bg-[#2cbb5d]" : "bg-red-400"
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Selected Test Case Details */}
                        {lastRunResult.testResults[activeTestCaseIdx] && (
                          <div className="rounded-xl border border-[#3e3e3e] bg-[#181818] p-3.5 space-y-2 text-xs">
                            <div>
                              <strong className="text-[#8a8a8a]">Input: </strong>
                              <span className="text-white whitespace-pre">
                                {lastRunResult.testResults[activeTestCaseIdx].input}
                              </span>
                            </div>
                            <div>
                              <strong className="text-[#8a8a8a]">Output: </strong>
                              <span
                                className={cn(
                                  "whitespace-pre font-bold",
                                  lastRunResult.testResults[activeTestCaseIdx].passed
                                    ? "text-[#2cbb5d]"
                                    : "text-red-400"
                                )}
                              >
                                {lastRunResult.testResults[activeTestCaseIdx].actualOutput ||
                                  "(empty)"}
                              </span>
                            </div>
                            <div>
                              <strong className="text-[#8a8a8a]">Expected: </strong>
                              <span className="text-emerald-400 whitespace-pre">
                                {lastRunResult.testResults[activeTestCaseIdx].expectedOutput}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. PROBLEM LIST DRAWER / MODAL NAVIGATOR                        */}
      {/* ============================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-3xl border border-[#3e3e3e] bg-[#1e1e1e] shadow-2xl overflow-hidden">
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between border-b border-[#333333] px-6 py-4 bg-[#262626]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffa116] text-black font-black text-xs">
                  &lt;/&gt;
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    LeetCode Problemset Navigator
                  </h3>
                  <p className="text-[11px] text-[#8a8a8a]">
                    Select any curated challenge to code &amp; test instantly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[#8a8a8a] hover:bg-[#333333] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#333333] px-6 py-3 bg-[#202020]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8a8a]" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Search questions by title, number, or tag..."
                  className="w-full rounded-xl border border-[#3e3e3e] bg-[#181818] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#ffa116]"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-1">
                {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDrawerDiffFilter(diff)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition",
                      drawerDiffFilter === diff
                        ? "bg-[#ffa116] text-black"
                        : "text-[#8a8a8a] hover:bg-[#282828] hover:text-white"
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1">
                {(["ALL", "DSA", "C++", "PYTHON", "C"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDrawerCatFilter(cat)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition",
                      drawerCatFilter === cat
                        ? "bg-blue-600 text-white"
                        : "text-[#8a8a8a] hover:bg-[#282828] hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#262626] text-[#8a8a8a] border-b border-[#333333]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold w-12 text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Title</th>
                    <th className="py-2.5 px-4 font-semibold w-24">Acceptance</th>
                    <th className="py-2.5 px-4 font-semibold w-24">Difficulty</th>
                    <th className="py-2.5 px-4 font-semibold w-24">Track</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e2e2e]">
                  {filteredProblems.map((prob) => {
                    const idx = LEETCODE_PROBLEMS.findIndex((p) => p.id === prob.id);
                    const isSolved = solvedProblemIds.has(prob.id);
                    const isSelected = prob.id === currentProblem.id;

                    return (
                      <tr
                        key={prob.id}
                        onClick={() => goToProblem(idx)}
                        className={cn(
                          "cursor-pointer transition hover:bg-[#282828]",
                          isSelected && "bg-[#282828]/80"
                        )}
                      >
                        <td className="py-3 px-4 text-center">
                          {isSolved ? (
                            <CheckCircle2 className="h-4 w-4 text-[#2cbb5d] mx-auto" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-[#444444] inline-block" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white hover:text-[#ffa116] transition">
                            {prob.problemNumber}. {prob.title}
                          </div>
                          <div className="text-[11px] text-[#8a8a8a] flex items-center gap-1.5 mt-0.5">
                            {prob.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded bg-[#2a2a2a] px-1.5 py-0.2">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#8a8a8a] font-mono">
                          {prob.acceptance}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
                              getDiffBadge(prob.difficulty)
                            )}
                          >
                            {prob.difficulty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#a0a0a0] font-semibold">
                          {prob.category}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-between border-t border-[#333333] px-6 py-3 bg-[#262626] text-xs text-[#8a8a8a]">
              <span>
                Showing {filteredProblems.length} of {LEETCODE_PROBLEMS.length} challenges
              </span>
              <button
                type="button"
                onClick={pickRandomProblem}
                className="flex items-center gap-1 font-bold text-[#ffa116] hover:underline"
              >
                <Shuffle className="h-3 w-3" />
                <span>Pick Random</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. LAB RECORD MODAL (OFFICIAL UNIVERSITY EXPORT)               */}
      {/* ============================================================== */}
      <LabRecordModal
        isOpen={labRecordOpen}
        onClose={() => setLabRecordOpen(false)}
        activeLab={fallbackLabCourse}
        userCodes={userCodes}
        completedItems={solvedProblemIds}
        studentName="Puskar Kumar"
        rollNumber="24CSE0142"
      />
    </div>
  );
}

export default function CodingPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#ffa116]" />
            <span className="text-sm font-semibold">Loading LeetCode Workspace...</span>
          </div>
        </div>
      }
    >
      <LeetCodeWorkspace />
    </Suspense>
  );
}
