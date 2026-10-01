"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Terminal,
  Loader2,
  FileCode,
  HelpCircle,
  Cpu,
  ChevronRight,
  BookOpen,
  Trophy,
  Award,
  Layers,
  Check,
  ChevronDown,
  Lock,
} from "lucide-react";
import { CODING_PROBLEMS } from "@/lib/coding-problems";
import {
  CODING_CURRICULUM,
  type CodingUnit,
  type CodingChapter,
  type CodingMCQ,
  type TrackCurriculum,
} from "@/lib/coding-curriculum";
import type {
  CodingProblem,
  LanguageId,
  TrackId,
  TestResult,
} from "@/lib/coding-types";
import { cn } from "@/lib/utils";

type SupportedTrack = "python" | "c" | "cpp" | "dsa";

function CodingPracticeInner() {
  const sp = useSearchParams();
  const urlProblemId = sp ? sp.get("problem") : null;
  const urlTrack = sp ? (sp.get("track") as SupportedTrack) : null;

  // Active track (Python, C, C++, DSA)
  const [activeTrack, setActiveTrack] = useState<SupportedTrack>(
    urlTrack && ["python", "c", "cpp", "dsa"].includes(urlTrack)
      ? urlTrack
      : "python"
  );

  const curriculum: TrackCurriculum = CODING_CURRICULUM[activeTrack];

  // Active chapter selection
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    curriculum.units[0]?.chapters[0]?.id || "py-ch1"
  );

  // Solved problems & MCQ scores
  const [problems, setProblems] = useState<CodingProblem[]>(CODING_PROBLEMS);
  const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
  const [mcqScores, setMcqScores] = useState<Record<string, { score: number; total: number }>>({});

  // Active problem selection
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    CODING_PROBLEMS[0]?.id || ""
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(
    curriculum.language
  );
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Execution state
  const [running, setRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"output" | "tests" | "mentor">("output");
  const [output, setOutput] = useState<string>("");
  const [errorOutput, setErrorOutput] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testsPassedCount, setTestsPassedCount] = useState<number>(0);
  const [allPassedSuccess, setAllPassedSuccess] = useState<boolean>(false);

  // AI Mentor state
  const [mentorLoading, setMentorLoading] = useState<boolean>(false);
  const [mentorResponse, setMentorResponse] = useState<string>("");

  // MCQ Quiz Modal state
  const [quizUnit, setQuizUnit] = useState<CodingUnit | null>(null);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load progress from localStorage
  useEffect(() => {
    try {
      const rawSolved = localStorage.getItem("sl_solved_problems");
      if (rawSolved) {
        const parsed = JSON.parse(rawSolved);
        if (Array.isArray(parsed)) setSolvedProblems(parsed);
      }
      const rawMcq = localStorage.getItem("sl_mcq_scores");
      if (rawMcq) {
        const parsed = JSON.parse(rawMcq);
        if (typeof parsed === "object" && parsed !== null) setMcqScores(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Fetch live questions from server (Teacher uploaded + Curated)
  useEffect(() => {
    async function loadDynamicProblems() {
      try {
        const res = await fetch("/api/code/problems?scope=all");
        const data = await res.json();
        if (data.ok && Array.isArray(data.problems) && data.problems.length > 0) {
          setProblems(data.problems);
        }
      } catch {
        // fallback
      }
    }
    void loadDynamicProblems();
  }, []);

  // 3. Handle deep linking via ?problem=xyz
  useEffect(() => {
    if (urlProblemId && problems.length > 0) {
      const hit = problems.find((p) => p.id === urlProblemId);
      if (hit) {
        setSelectedProblemId(hit.id);
        if (["python", "c", "cpp", "dsa"].includes(hit.track)) {
          setActiveTrack(hit.track as SupportedTrack);
        }
      }
    }
  }, [urlProblemId, problems]);

  // When track changes, update language and default chapter
  const handleTrackChange = (track: SupportedTrack) => {
    setActiveTrack(track);
    const newCurr = CODING_CURRICULUM[track];
    setSelectedLanguage(newCurr.language);
    const firstChapter = newCurr.units[0]?.chapters[0]?.id;
    if (firstChapter) {
      setSelectedChapterId(firstChapter);
    }
    // Select first problem of track
    const trackProblems = problems.filter((p) => p.track === track);
    if (trackProblems.length > 0) {
      setSelectedProblemId(trackProblems[0].id);
    }
    setOutput("");
    setErrorOutput("");
    setTestResults([]);
    setAllPassedSuccess(false);
  };

  // Find currently active chapter
  const currentChapter: CodingChapter | undefined = useMemo(() => {
    for (const u of curriculum.units) {
      const found = u.chapters.find((ch) => ch.id === selectedChapterId);
      if (found) return found;
    }
    return curriculum.units[0]?.chapters[0];
  }, [curriculum, selectedChapterId]);

  // Track problems (all problems for this track)
  const trackProblems = useMemo(() => {
    return problems.filter((p) => p.track === activeTrack);
  }, [problems, activeTrack]);

  // Chapter-associated problems
  const chapterProblems = useMemo(() => {
    if (!currentChapter) return trackProblems;
    const targetIds = new Set(currentChapter.codingProblemIds);
    const matched = trackProblems.filter(
      (p) => targetIds.has(p.id) || p.chapterId === currentChapter.id
    );
    // If no direct matches, show track problems so student is never blocked
    return matched.length > 0 ? matched : trackProblems;
  }, [currentChapter, trackProblems]);

  // Current problem
  const currentProblem: CodingProblem = useMemo(() => {
    const found = problems.find((p) => p.id === selectedProblemId);
    if (found && found.track === activeTrack) return found;
    if (chapterProblems.length > 0) return chapterProblems[0];
    if (trackProblems.length > 0) return trackProblems[0];
    return problems[0] || CODING_PROBLEMS[0];
  }, [selectedProblemId, problems, activeTrack, chapterProblems, trackProblems]);

  // Code key: problemId + language
  const codeKey = `${currentProblem.id}_${selectedLanguage}`;
  const currentCode =
    userCodes[codeKey] !== undefined
      ? userCodes[codeKey]
      : currentProblem.starterCode?.[selectedLanguage] || "";

  const handleCodeChange = (newCode: string) => {
    setUserCodes((prev) => ({
      ...prev,
      [codeKey]: newCode,
    }));
  };

  const handleResetCode = () => {
    if (confirm("Reset code to default starter template?")) {
      handleCodeChange(currentProblem.starterCode?.[selectedLanguage] || "");
    }
  };

  // Run with custom input
  const runCodeCustom = async () => {
    setRunning(true);
    setActiveTab("output");
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
    setActiveTab("tests");
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
          setSolvedProblems((prev) => {
            const next = Array.from(new Set([...prev, currentProblem.id]));
            try {
              localStorage.setItem("sl_solved_problems", JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
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

  // MCQ Quiz Handlers
  const startQuiz = (unit: CodingUnit) => {
    setQuizUnit(unit);
    setQuizIndex(0);
    setUserAnswers({});
    setQuizCompleted(false);
  };

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (userAnswers[questionIdx] !== undefined) return; // already answered
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const finishQuiz = () => {
    if (!quizUnit) return;
    let score = 0;
    quizUnit.mcqs.forEach((mcq, idx) => {
      if (userAnswers[idx] === mcq.correctIndex) {
        score++;
      }
    });

    const key = `${activeTrack}_u${quizUnit.unitNumber}`;
    const nextScores = {
      ...mcqScores,
      [key]: { score, total: quizUnit.mcqs.length },
    };
    setMcqScores(nextScores);
    try {
      localStorage.setItem("sl_mcq_scores", JSON.stringify(nextScores));
    } catch {
      // ignore
    }
    setQuizCompleted(true);
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Track Switcher Bar */}
      <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300">
              <Cpu className="h-4 w-4" />
              Modular Coding Academy
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl text-white">
              {curriculum.title}
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              {curriculum.tagline}
            </p>
          </div>

          {/* 4 Dedicated Track Tabs */}
          <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
            {(
              [
                ["python", "Python 🐍"],
                ["c", "C Language ⚡"],
                ["cpp", "C++ 🚀"],
                ["dsa", "DSA 🧠"],
              ] as const
            ).map(([tId, label]) => (
              <button
                key={tId}
                type="button"
                onClick={() => handleTrackChange(tId)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition",
                  activeTrack === tId
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Grid: Modular Syllabus / Chapters vs IDE */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        {/* Left Column: Units, Chapters & Unit MCQs */}
        <div className="space-y-4">
          {/* Track Header Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Course Syllabus
              </span>
              <h2 className="text-sm font-extrabold text-slate-900">
                3 Units • {curriculum.totalChapters} Chapters
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                {trackProblems.length} Coding Problems
              </span>
            </div>
          </div>

          {/* Units Accordion / List */}
          <div className="space-y-4 max-h-[820px] overflow-y-auto pr-1">
            {curriculum.units.map((unit) => {
              const unitKey = `${activeTrack}_u${unit.unitNumber}`;
              const unitMcqScore = mcqScores[unitKey];
              const isUnit3 = unit.unitNumber === 3;

              return (
                <div
                  key={unit.unitNumber}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                >
                  {/* Unit Title & Assessment Button */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                          Unit {unit.unitNumber}
                        </span>
                        <h3 className="text-xs font-black text-slate-900 truncate">
                          {unit.title.split(": ")[1] || unit.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                        {unit.description}
                      </p>
                    </div>

                    {/* Unit MCQ Assessment Button */}
                    <button
                      type="button"
                      onClick={() => startQuiz(unit)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition shadow-xs",
                        unitMcqScore
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : isUnit3
                            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      )}
                    >
                      <Trophy className="h-3 w-3" />
                      {unitMcqScore
                        ? `Score: ${unitMcqScore.score}/${unitMcqScore.total} ✓`
                        : isUnit3
                          ? "Milestone MCQ Test"
                          : `Unit ${unit.unitNumber} MCQ`}
                    </button>
                  </div>

                  {/* Chapters Inside This Unit */}
                  <div className="space-y-1.5">
                    {unit.chapters.map((ch) => {
                      const isSelected = ch.id === selectedChapterId;
                      const chProblems = trackProblems.filter(
                        (p) =>
                          ch.codingProblemIds.includes(p.id) ||
                          p.chapterId === ch.id
                      );

                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedChapterId(ch.id);
                            if (chProblems.length > 0) {
                              setSelectedProblemId(chProblems[0].id);
                              setOutput("");
                              setErrorOutput("");
                              setTestResults([]);
                              setAllPassedSuccess(false);
                            }
                          }}
                          className={cn(
                            "w-full text-left rounded-2xl p-3 transition flex items-center justify-between gap-3 border",
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold shadow-xs"
                              : "border-transparent bg-slate-50/60 hover:bg-slate-100/70 text-slate-700"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400">
                                Ch {ch.chapterNumber}
                              </span>
                              <span className="text-xs font-bold truncate">
                                {ch.title}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-slate-500">
                              {ch.topics.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="rounded bg-white/80 px-1 py-0.2 border border-slate-200/50"
                                >
                                  {t}
                                </span>
                              ))}
                              {chProblems.length > 0 && (
                                <span className="font-semibold text-indigo-600">
                                  • {chProblems.length} problem{chProblems.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 transition",
                              isSelected ? "text-indigo-600" : "text-slate-300"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chapter Problems Quick Picker */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              Problems in this Chapter ({chapterProblems.length})
            </div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
              {chapterProblems.map((prob) => {
                const isSelected = prob.id === currentProblem.id;
                const isSolved = solvedProblems.includes(prob.id);
                const isTeacher = prob.source === "teacher";

                return (
                  <button
                    key={prob.id}
                    type="button"
                    onClick={() => {
                      setSelectedProblemId(prob.id);
                      setOutput("");
                      setErrorOutput("");
                      setTestResults([]);
                      setAllPassedSuccess(false);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl px-2.5 py-1.5 text-xs transition flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isSolved && (
                        <CheckCircle2
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isSelected ? "text-white" : "text-emerald-600"
                          )}
                        />
                      )}
                      {isTeacher && (
                        <span
                          className={cn(
                            "rounded px-1 text-[9px] font-bold uppercase",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-violet-100 text-violet-800"
                          )}
                        >
                          Teacher
                        </span>
                      )}
                      <span className="truncate">{prob.title}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold shrink-0",
                        isSelected ? "text-indigo-200" : "text-slate-400"
                      )}
                    >
                      {prob.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Console */}
        <div className="space-y-4">
          {/* Problem Statement Header Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    {currentProblem.track}
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
                  {currentProblem.source === "teacher" && (
                    <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-800 border border-violet-200">
                      👨‍🏫 Teacher Assigned
                    </span>
                  )}
                  {currentChapter && (
                    <span className="text-[11px] font-bold text-slate-400">
                      • Ch {currentChapter.chapterNumber}: {currentChapter.title}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {currentProblem.title}
                </h2>
              </div>

              {solvedProblems.includes(currentProblem.id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Solved ✓
                </span>
              )}
            </div>

            {/* Description & Constraints Accordion / Block */}
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {currentProblem.description}
            </div>

            <div className="grid gap-2 sm:grid-cols-3 rounded-2xl bg-slate-50 p-3 text-[11px]">
              <div>
                <span className="font-bold text-slate-700">Input: </span>
                <span className="text-slate-600">{currentProblem.inputFormat}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Output: </span>
                <span className="text-slate-600">{currentProblem.outputFormat}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Constraints: </span>
                <code className="rounded bg-slate-200/80 px-1 py-0.2 font-mono text-[10px]">
                  {currentProblem.constraints}
                </code>
              </div>
            </div>
          </div>

          {/* Editor Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">Language:</span>
              <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                {(["python", "c", "cpp"] as LanguageId[]).map((lang) => (
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
                Run (Custom/Sample)
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
                main.{selectedLanguage === "python" ? "py" : selectedLanguage === "c" ? "c" : "cpp"}
              </span>
              <span>Tab = 4 spaces</span>
            </div>
            <textarea
              ref={textareaRef}
              value={currentCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full min-h-[360px] bg-transparent p-4 text-xs font-mono text-emerald-300 leading-relaxed outline-none resize-y selection:bg-indigo-600/50"
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

          {/* Console / Output / Tests / Mentor Tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("output")}
                className={cn(
                  "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                  activeTab === "output"
                    ? "border-indigo-600 text-indigo-600 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                )}
              >
                <Terminal className="h-3.5 w-3.5" /> Output Console
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tests")}
                className={cn(
                  "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                  activeTab === "tests"
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
                onClick={() => setActiveTab("mentor")}
                className={cn(
                  "rounded-t-xl px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5",
                  activeTab === "mentor"
                    ? "border-indigo-600 text-indigo-600 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Mentor
              </button>
            </div>

            <div className="p-4 min-h-[180px] max-h-[420px] overflow-y-auto space-y-3">
              {/* Tab 1: Output */}
              {activeTab === "output" && (
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
                      Click <strong>Run</strong> to test custom input or <strong>Submit &amp; Test</strong> for full CodeTantra evaluation.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Tab 2: Tests (CodeTantra Workflow) */}
              {activeTab === "tests" && (
                <div className="space-y-3">
                  {/* CodeTantra All Passed Success Banner */}
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
                              Accepted • 100% Score • {testResults.length}/{testResults.length} Test cases verified (including hidden checks).
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm border border-white/25">
                            Status: Accepted ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {testResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                      <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
                      Click <strong>Submit &amp; Test (CodeTantra)</strong> to evaluate your code against all test cases.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold pb-1 border-b border-slate-100">
                        <span>
                          Test Case Results: {testsPassedCount} of {testResults.length} Passed
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
                            ? "All Test Cases Passed ✓"
                            : `${testResults.length - testsPassedCount} Test Cases Failed ✗`}
                        </span>
                      </div>

                      {testResults.map((tr, idx) => {
                        const matchingTc = (currentProblem.testCases || []).find(
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

                            <div className="text-[11px] font-bold">
                              {tr.passed ? (
                                <span className="text-emerald-700">PASSED ✓</span>
                              ) : (
                                <span className="text-rose-700">FAILED ✗</span>
                              )}
                            </div>

                            {/* Failure Details */}
                            {!tr.passed && (
                              <div className="w-full mt-2 space-y-1 font-mono text-[11px] rounded-lg bg-white/70 p-2.5 border border-rose-100">
                                {isSecret ? (
                                  <div className="text-slate-600 italic">
                                    🔒 Hidden Test Case: Input and expected output are hidden. Ensure your solution handles boundary cases, empty inputs, or edge values properly.
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
                                      <span className="text-slate-500">Your Program Output: </span>
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

              {/* Tab 3: Mentor */}
              {activeTab === "mentor" && (
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
                      ⚡ Code &amp; Complexity Review
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
                      Ask your AI Mentor for gentle hints without spoiling the solution, or to diagnose tricky syntax and algorithmic bugs.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Unit MCQ Quiz Modal */}
      {quizUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-indigo-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                  {curriculum.title} • Unit {quizUnit.unitNumber}
                </span>
                <h3 className="text-base font-black text-white">
                  {quizUnit.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuizUnit(null)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {!quizCompleted ? (
                <>
                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>
                      Question {quizIndex + 1} of {quizUnit.mcqs.length}
                    </span>
                    <span>
                      {Math.round(((quizIndex + 1) / quizUnit.mcqs.length) * 100)}% Completed
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${((quizIndex + 1) / quizUnit.mcqs.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Active Question */}
                  {(() => {
                    const currentMcq: CodingMCQ = quizUnit.mcqs[quizIndex];
                    const chosenOption = userAnswers[quizIndex];
                    const isAnswered = chosenOption !== undefined;

                    return (
                      <div className="space-y-4">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {currentMcq.question}
                        </h4>

                        {currentMcq.codeSnippet && (
                          <pre className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                            {currentMcq.codeSnippet}
                          </pre>
                        )}

                        {/* Options */}
                        <div className="space-y-2">
                          {currentMcq.options.map((opt, optIdx) => {
                            const isChosen = chosenOption === optIdx;
                            const isCorrect = optIdx === currentMcq.correctIndex;

                            let btnStyle =
                              "border-slate-200 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-200 text-slate-800";
                            if (isAnswered) {
                              if (isCorrect) {
                                btnStyle =
                                  "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-200";
                              } else if (isChosen) {
                                btnStyle =
                                  "border-rose-400 bg-rose-50 text-rose-950 font-bold";
                              } else {
                                btnStyle = "opacity-50 border-slate-200 bg-slate-50 text-slate-400";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(quizIndex, optIdx)}
                                className={cn(
                                  "w-full text-left rounded-2xl border p-3.5 text-xs sm:text-sm transition flex items-center justify-between gap-3",
                                  btnStyle
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black shadow-xs border">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </span>
                                {isAnswered && isCorrect && (
                                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                                {isAnswered && isChosen && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation on Answer */}
                        {isAnswered && (
                          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950 leading-relaxed animate-in fade-in">
                            <span className="font-bold">Explanation: </span>
                            {currentMcq.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* Quiz Results Screen */
                (() => {
                  let correctCount = 0;
                  quizUnit.mcqs.forEach((mcq, idx) => {
                    if (userAnswers[idx] === mcq.correctIndex) correctCount++;
                  });
                  const percentage = Math.round(
                    (correctCount / quizUnit.mcqs.length) * 100
                  );

                  return (
                    <div className="text-center py-6 space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-md">
                        <Trophy className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900">
                          Unit {quizUnit.unitNumber} Quiz Completed!
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {curriculum.title}
                        </p>
                      </div>

                      <div className="mx-auto max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-3xl font-black text-indigo-600">
                          {correctCount} / {quizUnit.mcqs.length}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">
                          Score: {percentage}%
                        </div>
                        <div className="mt-2 text-[11px] font-bold text-emerald-600">
                          {percentage >= 75
                            ? "🎉 Concept Mastery Verified!"
                            : "Keep practicing! Review explanations and retry."}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-slate-100 bg-slate-50 p-4 flex items-center justify-between">
              {!quizCompleted ? (
                <>
                  <button
                    type="button"
                    disabled={quizIndex === 0}
                    onClick={() => setQuizIndex((prev) => prev - 1)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {quizIndex < quizUnit.mcqs.length - 1 ? (
                    <button
                      type="button"
                      disabled={userAnswers[quizIndex] === undefined}
                      onClick={() => setQuizIndex((prev) => prev + 1)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={userAnswers[quizIndex] === undefined}
                      onClick={finishQuiz}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-40"
                    >
                      Finish Quiz &amp; Save Score
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswers({});
                      setQuizIndex(0);
                      setQuizCompleted(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Retake Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizUnit(null)}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Done &amp; Continue Coding
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
