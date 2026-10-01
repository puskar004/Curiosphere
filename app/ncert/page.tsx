"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Atom,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  Clock,
  FlaskConical,
  GraduationCap,
  Leaf,
  Lock,
  Search,
  Sigma,
  Sparkles,
  Unlock,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { CURRICULUM, type Grade, type Subject } from "@/lib/curriculum";
import {
  loadProgress,
  markChapterOpened,
  saveProgress,
} from "@/lib/user-store";
import type { ChapterAssignment } from "@/lib/classroom-types";
import PdfReaderModal from "@/components/PdfReaderModal";
import { cn } from "@/lib/utils";

const SUBJECT_THEME: Record<
  string,
  { bar: string; iconBg: string; ring: string; soft: string; Icon: typeof Atom }
> = {
  physics: {
    bar: "from-sky-400/30 to-indigo-400/10",
    iconBg: "bg-indigo-500",
    ring: "stroke-indigo-500",
    soft: "bg-sky-50/80",
    Icon: Atom,
  },
  chemistry: {
    bar: "from-rose-400/30 to-orange-300/10",
    iconBg: "bg-rose-500",
    ring: "stroke-rose-500",
    soft: "bg-rose-50/80",
    Icon: FlaskConical,
  },
  maths: {
    bar: "from-emerald-400/30 to-teal-300/10",
    iconBg: "bg-emerald-500",
    ring: "stroke-emerald-500",
    soft: "bg-emerald-50/80",
    Icon: Sigma,
  },
  biology: {
    bar: "from-violet-400/30 to-fuchsia-300/10",
    iconBg: "bg-violet-500",
    ring: "stroke-violet-500",
    soft: "bg-violet-50/80",
    Icon: Leaf,
  },
  science: {
    bar: "from-cyan-400/30 to-blue-300/10",
    iconBg: "bg-cyan-600",
    ring: "stroke-cyan-600",
    soft: "bg-cyan-50/80",
    Icon: FlaskConical,
  },
  default: {
    bar: "from-violet-400/25 to-indigo-300/10",
    iconBg: "bg-violet-600",
    ring: "stroke-violet-600",
    soft: "bg-violet-50/80",
    Icon: BookOpen,
  },
};

function ProgressRing({
  value,
  label,
  ringClass,
}: {
  value: number;
  label: string;
  ringClass: string;
}) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-slate-200/80"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={ringClass}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-extrabold text-slate-800">{value}%</span>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function SubjectCard({
  subject,
  grade,
  opened,
  onOpenPdf,
  expanded,
  onToggle,
  assignmentsMap,
  hasAssignments,
}: {
  subject: Subject;
  grade: Grade;
  opened: Set<string>;
  onOpenPdf: (title: string, link?: string, chapterId?: string) => void;
  expanded: boolean;
  onToggle: () => void;
  assignmentsMap?: Record<string, ChapterAssignment>;
  hasAssignments?: boolean;
}) {
  const theme = SUBJECT_THEME[subject.id] || SUBJECT_THEME.default;
  const Icon = theme.Icon;
  const done = subject.chapters.filter((c) => opened.has(c.id)).length;
  const pct = subject.chapters.length
    ? Math.round((done / subject.chapters.length) * 100)
    : 0;
  const preview = expanded ? subject.chapters : subject.chapters.slice(0, 5);

  return (
    <section
      className={cn(
        "sl-card group rounded-3xl border border-white/70 bg-gradient-to-br p-5 shadow-sm",
        theme.bar,
        "hover:border-violet-200/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition group-hover:scale-105",
              theme.iconBg
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {subject.name}
            </h2>
            <p className="text-xs text-slate-500">
              {subject.chapters.length} chapters · NCERT + PYQs{" "}
              {subject.pyqYears[0]}–{subject.pyqYears.at(-1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProgressRing
            value={pct}
            label={`${done}/${subject.chapters.length}`}
            ringClass={theme.ring}
          />
          <div className="hidden text-right sm:block">
            <div className="text-xs font-bold text-slate-700">
              {done}/{subject.chapters.length}
            </div>
            <div className="text-[10px] text-slate-400">Opened</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {preview.map((ch) => {
          const isOpen = opened.has(ch.id);
          const assignment = assignmentsMap?.[ch.id];
          const isAssigned = Boolean(assignment);
          const isLocked = Boolean(hasAssignments && !isAssigned);

          const todayStr = new Date().toISOString().split("T")[0];
          const isOverdue = assignment ? assignment.deadline < todayStr : false;
          const isDueToday = assignment ? assignment.deadline === todayStr : false;

          return (
            <li
              key={ch.id}
              className={cn(
                "sl-row flex flex-wrap items-center gap-2 rounded-xl border border-transparent px-2.5 py-2",
                theme.soft,
                isLocked ? "opacity-75 bg-slate-50/50" : "hover:border-white hover:shadow-sm"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    Ch. {ch.number}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      isOpen ? "text-violet-800" : "text-slate-800"
                    )}
                  >
                    {ch.title}
                  </span>
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {ch.topics.slice(0, 3).join(" · ")}
                </div>

                {/* Teacher Deadline or Lock Status */}
                {isAssigned && assignment && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100/90 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        <AlertCircle className="h-2.5 w-2.5" /> Due: {assignment.deadline} (Overdue)
                      </span>
                    ) : isDueToday ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="h-2.5 w-2.5" /> Due Today ({assignment.deadline})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CalendarCheck className="h-2.5 w-2.5" /> Due: {assignment.deadline}
                      </span>
                    )}
                    {assignment.note && (
                      <span className="truncate text-[10px] text-slate-500 italic">
                        · {assignment.note}
                      </span>
                    )}
                  </div>
                )}
                {isLocked && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      <Lock className="h-2.5 w-2.5" /> Locked by teacher
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {isLocked ? (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400 cursor-not-allowed">
                    Locked
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPdf(
                          `Class ${grade} ${subject.name} · Ch ${ch.number} ${ch.title}`,
                          ch.ncertPdf,
                          ch.id
                        )
                      }
                      className="rounded-lg bg-emerald-100/90 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-500 hover:text-white"
                    >
                      PDF
                    </button>
                    <Link
                      href={`/pyq?grade=${grade}&subject=${subject.id}`}
                      className="rounded-lg bg-sky-100/90 px-2 py-1 text-[10px] font-bold text-sky-700 transition hover:bg-sky-500 hover:text-white"
                    >
                      PYQs
                    </Link>
                    <Link
                      href={`/quiz/${ch.id}`}
                      className="rounded-lg bg-rose-100/90 px-2 py-1 text-[10px] font-bold text-rose-700 transition hover:bg-rose-500 hover:text-white"
                    >
                      Quiz
                    </Link>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {subject.chapters.length > 5 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-3 text-xs font-bold text-violet-600 transition hover:text-violet-800"
        >
          {expanded
            ? "Show less"
            : `View all ${subject.chapters.length} chapters →`}
        </button>
      )}
    </section>
  );
}

function NcertInner() {
  const sp = useSearchParams();
  const { userId } = useAuth();
  const { user } = useUser();
  const initialGrade = (sp.get("grade") as Grade) || "12";
  const [grade, setGrade] = useState<Grade>(
    ["10", "11", "12"].includes(initialGrade) ? initialGrade : "12"
  );
  const [q, setQ] = useState(sp.get("q") || "");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [reader, setReader] = useState<{
    title: string;
    link?: string;
  } | null>(null);

  const [classrooms, setClassrooms] = useState<
    Array<{
      code: string;
      name: string;
      teacherName: string;
      chapterAssignments?: ChapterAssignment[];
    }>
  >([]);
  const [onlyAssigned, setOnlyAssigned] = useState<boolean>(true);

  useEffect(() => {
    let unmounted = false;
    async function loadJoined() {
      try {
        const res = await fetch("/api/classroom?action=joined");
        const data = await res.json();
        if (!unmounted && data.ok && Array.isArray(data.classrooms)) {
          setClassrooms(data.classrooms);
        }
      } catch {
        // ignore
      }
    }
    loadJoined();
    return () => {
      unmounted = true;
    };
  }, []);

  const allAssignments = useMemo(() => {
    const list: ChapterAssignment[] = [];
    const seen = new Set<string>();
    for (const c of classrooms) {
      for (const a of c.chapterAssignments || []) {
        if (a && a.chapterId && !seen.has(a.chapterId)) {
          seen.add(a.chapterId);
          list.push(a);
        }
      }
    }
    return list;
  }, [classrooms]);

  const assignmentsMap = useMemo(() => {
    const map: Record<string, ChapterAssignment> = {};
    for (const a of allAssignments) {
      map[a.chapterId] = a;
    }
    return map;
  }, [allAssignments]);

  const hasAssignments = allAssignments.length > 0;

  const pack = useMemo(
    () => CURRICULUM.find((g) => g.grade === grade)!,
    [grade]
  );

  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      const p = loadProgress(userId);
      setOpened(new Set(p.chaptersOpened));
      if (p.grade) setGrade(p.grade);
    };
    sync();
    window.addEventListener("sl-grade-changed", sync);
    return () => window.removeEventListener("sl-grade-changed", sync);
  }, [userId]);

  const subjects = useMemo(() => {
    let list = pack.subjects;
    // Strict Teacher Allowed Chapters Mode:
    // If student has classroom assignments, or is enrolled in a class, ONLY show chapters allowed by teacher!
    if (hasAssignments) {
      list = list
        .map((s) => ({
          ...s,
          chapters: s.chapters.filter((c) => Boolean(assignmentsMap[c.id])),
        }))
        .filter((s) => s.chapters.length > 0);
    } else if (classrooms.length > 0) {
      // Enrolled in class but teacher hasn't unlocked any chapters yet
      list = [];
    }

    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list
      .map((s) => ({
        ...s,
        chapters: s.chapters.filter(
          (c) =>
            c.title.toLowerCase().includes(needle) ||
            c.topics.some((t) => t.toLowerCase().includes(needle)) ||
            s.name.toLowerCase().includes(needle)
        ),
      }))
      .filter((s) => s.chapters.length > 0);
  }, [pack, q, hasAssignments, classrooms.length, assignmentsMap]);

  const totalCh = pack.subjects.reduce((n, s) => n + s.chapters.length, 0);
  const openedCount = pack.subjects.reduce(
    (n, s) => n + s.chapters.filter((c) => opened.has(c.id)).length,
    0
  );
  const overall = totalCh ? Math.round((openedCount / totalCh) * 100) : 0;

  const openPdf = (title: string, link?: string, chapterId?: string) => {
    if (userId && chapterId) {
      markChapterOpened(userId, chapterId);
      setOpened((prev) => new Set([...prev, chapterId]));
    }
    setReader({ title, link });
  };

  return (
    <div className="relative px-4 py-6 lg:px-8 lg:py-8">
      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-20 h-32 w-32 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">
              NCERT &amp; Chapters
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Your Complete CBSE{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Bookshelf
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Official NCERT chapters, PYQs, quizzes and AI-powered learning —
              all in one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Official NCERT PDFs",
                "Chapter-wise PYQs",
                "Interactive Quizzes",
                "Video Explanations",
                "AI Summaries",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-violet-100 bg-violet-50/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xs rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-5 text-white shadow-xl shadow-violet-500/25 transition hover:brightness-105 sm:w-auto">
            <div className="text-xs font-semibold opacity-90">Class {grade}</div>
            <p className="mt-2 text-sm font-medium leading-snug">
              “Discipline today, results tomorrow.”
            </p>
            <div className="mt-3 text-2xl font-black">{overall}%</div>
            <div className="text-[11px] opacity-80">
              {openedCount}/{totalCh} chapters explored
            </div>
          </div>
        </div>

        <p className="pointer-events-none absolute right-8 top-8 hidden rotate-6 text-xs font-semibold text-violet-400/80 md:block">

        </p>
      </div>

      {/* Teacher Assigned Chapters Alert Banner */}
      {hasAssignments && (
        <div className="mt-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-violet-50/90 to-purple-50/90 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                  Teacher-Allowed Chapters ({allAssignments.length} Unlocked)
                </h2>
                <p className="text-xs text-slate-600">
                  Only chapters approved and scheduled by your teacher with completion deadlines are visible.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
                <Lock className="h-3 w-3 text-indigo-600" />
                Teacher Locked ({allAssignments.length} Allowed)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {(["10", "11", "12"] as Grade[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGrade(g);
                if (userId) {
                  const p = loadProgress(userId);
                  saveProgress({ ...p, grade: g, gradeChosen: true });
                  window.dispatchEvent(new Event("sl-grade-changed"));
                }
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition",
                grade === g
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Class {g}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subjects or chapters…"
            className="w-full rounded-full border border-slate-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-500"
        >
          <Sparkles className="h-3.5 w-3.5" />
          My Progress
        </Link>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              grade={grade}
              opened={opened}
              expanded={Boolean(expanded[s.id])}
              onToggle={() =>
                setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))
              }
              onOpenPdf={openPdf}
              assignmentsMap={assignmentsMap}
              hasAssignments={hasAssignments}
            />
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-indigo-200 bg-white/70 p-10 text-center">
              <Lock className="mx-auto h-10 w-10 text-indigo-400 mb-2" />
              <h3 className="text-base font-bold text-slate-800">
                {q.trim()
                  ? `No chapters match "${q}"`
                  : `No Chapters Unlocked Yet for Class ${grade}`}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {q.trim()
                  ? "Try searching with a different chapter name or topic keyword."
                  : "Your teacher hasn't unlocked any chapters for your class yet. As soon as your teacher schedules a chapter in the Teacher Panel, it will appear here with target completion deadlines."}
              </p>
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="sl-card rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">
              Overall Progress
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <ProgressRing
                value={overall}
                label="overall"
                ringClass="stroke-violet-600"
              />
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {overall}%
                </div>
                <div className="text-xs text-slate-500">
                  {openedCount} / {totalCh} chapters
                </div>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              👏 Keep going!{" "}
              {user?.firstName
                ? `${user.firstName}, you're building momentum.`
                : "You're building momentum."}
            </p>
          </div>

          <div className="sl-card rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">
              Quick Actions
            </h3>
            <div className="mt-3 space-y-2">
              {[
                { href: "/quiz", label: "Take a Random Quiz" },
                { href: "/pyq", label: "View PYQs by Year" },
                { href: "/ai-tutor", label: "Ask AI a Doubt" },
                { href: "/safe-search", label: "Watch Video Explanations" },
                { href: "/blueprint", label: "Open Study Plan" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="block rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-violet-600/20 transition hover:brightness-105">
            <p className="text-sm font-bold leading-snug">
              “Same Books. Smarter Learning.”
            </p>
            <Link
              href="/quiz"
              className="mt-3 inline-flex text-xs font-semibold text-violet-100 underline-offset-2 hover:underline"
            >
              Practice board quizzes →
            </Link>
          </div>
        </aside>
      </div>

      <PdfReaderModal
        open={Boolean(reader)}
        title={reader?.title || ""}
        ncertLink={reader?.link}
        onClose={() => setReader(null)}
      />
    </div>
  );
}

export default function NcertPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-slate-500">Loading bookshelf…</div>
      }
    >
      <NcertInner />
    </Suspense>
  );
}
