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
} from "lucide-react";
import { CODING_PROBLEMS } from "@/lib/coding-problems";
import type {
  CodingProblem,
  LanguageId,
  TrackId,
  TestResult,
} from "@/lib/coding-types";
import { cn } from "@/lib/utils";

function CodingPracticeInner() {
  const sp = useSearchParams();
  const urlProblemId = sp ? sp.get("problem") : null;

  const [problems, setProblems] = useState<CodingProblem[]>(CODING_PROBLEMS);
  const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
  const [activeTrack, setActiveTrack] = useState<TrackId>("all");
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    CODING_PROBLEMS[0]?.id || ""
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>("python");
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load solved problems from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sl_solved_problems");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSolvedProblems(parsed);
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
        // keep fallback CODING_PROBLEMS
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
        if (hit.track !== "all") {
          setActiveTrack(hit.track);
        }
      }
    }
  }, [urlProblemId, problems]);

  // Filter problems by active track
  const filteredProblems = useMemo(() => {
    if (activeTrack === "all") return problems;
    return problems.filter((p) => p.track === activeTrack);
  }, [activeTrack, problems]);

  const currentProblem: CodingProblem = useMemo(() => {
    const found = problems.find((p) => p.id === selectedProblemId);
    if (found) return found;
    if (filteredProblems.length > 0) return filteredProblems[0];
    return problems[0] || CODING_PROBLEMS[0];
  }, [selectedProblemId, problems, filteredProblems]);

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
          // Mark problem as solved locally
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

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300">
              <Cpu className="h-4 w-4" />
              Interactive Code Laboratory
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Student Coding Practice
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Solve teacher-assigned and curated challenges in Python, C, C++, and DSA. Test your code against automated test cases with instant feedback.
            </p>
          </div>

          {/* Track selector pills */}
          <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
            {(
              [
                ["all", "All Problems"],
                ["python", "Python 🐍"],
                ["c", "C ⚡"],
                ["cpp", "C++ 🚀"],
                ["dsa", "DSA 🧠"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTrack(id);
                  const matching =
                    id === "all" ? problems : problems.filter((p) => p.track === id);
                  if (matching.length > 0) {
                    setSelectedProblemId(matching[0].id);
                  }
                }}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                  activeTrack === id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Left Column: Problem List & Problem Statement */}
        <div className="space-y-5">
          {/* Problem Selector Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Select Challenge ({filteredProblems.length})
              </h2>
              {solvedProblems.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {solvedProblems.length} Solved ✓
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredProblems.map((prob) => {
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
                      "w-full text-left rounded-xl px-3 py-2.5 transition flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSolved && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        {isTeacher && (
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.2 text-[9px] font-bold text-violet-800 border border-violet-200">
                            Teacher
                          </span>
                        )}
                        <span className="truncate text-xs font-semibold">
                          {prob.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span className="uppercase">{prob.track}</span>
                        <span>•</span>
                        <span
                          className={cn(
                            "capitalize",
                            prob.difficulty === "easy"
                              ? "text-emerald-600"
                              : prob.difficulty === "medium"
                                ? "text-amber-600"
                                : "text-rose-600"
                          )}
                        >
                          {prob.difficulty}
                        </span>
                        <span>• {prob.testCases?.length || 0} tests</span>
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

          {/* Problem Statement Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
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
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {currentProblem.title}
                </h2>
              </div>

              {solvedProblems.includes(currentProblem.id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Solved
                </span>
              )}
            </div>

            {/* Description */}
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {currentProblem.description}
            </div>

            {/* Constraints & Specs */}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs">
              <div>
                <span className="font-bold text-slate-700">Input Format: </span>
                <span className="text-slate-600">{currentProblem.inputFormat}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Output Format: </span>
                <span className="text-slate-600">{currentProblem.outputFormat}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Constraints: </span>
                <code className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                  {currentProblem.constraints}
                </code>
              </div>
            </div>

            {/* Sample I/O */}
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sample Input (STDIN)
                </div>
                <pre className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-xs text-slate-900 whitespace-pre-wrap">
                  {currentProblem.sampleInput || "(Empty)"}
                </pre>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sample Output (STDOUT)
                </div>
                <pre className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-xs text-slate-900 whitespace-pre-wrap">
                  {currentProblem.sampleOutput || "(Empty)"}
                </pre>
              </div>
              {currentProblem.explanation && (
                <div className="text-[11px] text-slate-500 italic pt-1">
                  💡 {currentProblem.explanation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Console */}
        <div className="space-y-4">
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
