"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  GraduationCap,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Radio,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  Users,
  Video,
} from "lucide-react";
import MeetFrame from "@/components/MeetFrame";
import PdfReaderModal from "@/components/PdfReaderModal";
import { CURRICULUM } from "@/lib/curriculum";
import { CODING_CURRICULUM } from "@/lib/coding-curriculum";
import type {
  CodingProblem,
  Difficulty,
  LanguageId,
  TestCase,
  TrackId,
} from "@/lib/coding-types";
import {
  apiAddMaterial,
  apiAssignChapter,
  apiCreateClassroom,
  apiDeleteClassroom,
  apiEndLive,
  apiListMyClasses,
  apiRemoveChapterAssignment,
  apiRenameClassroom,
  apiSendRemark,
  apiStartLive,
  apiUpdateChapterDeadline,
  apiUploadMaterialFile,
  getRole,
  setRole,
  type ChapterAssignment,
  type Classroom,
  type StudentSnapshot,
} from "@/lib/teacher-store";
import { cn } from "@/lib/utils";

type TeacherTab =
  | "students"
  | "materials"
  | "live"
  | "code"
  | "attendance"
  | "chapters"
  | "coding";

function TeacherInner() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") as TeacherTab) || "students";

  const cacheKey = userId ? `sl_teacher_classes_${userId}` : "";
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [room, setRoom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);

  const selectClass = useCallback(
    (code: string, list?: Classroom[]) => {
      const src = list || classes;
      const c = code.toUpperCase();
      setActiveCode(c);
      const hit = src.find((x) => x.code === c) || null;
      if (hit) setRoom(hit);
      // never clear room on switch if hit missing — keep previous until loaded
    },
    [classes]
  );

  const persistClasses = useCallback(
    (list: Classroom[]) => {
      setClasses(list);
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
    },
    [cacheKey]
  );
  const [busy, setBusy] = useState(false);
  const [className, setClassName] = useState("Class 12 Science A");
  const [renameTo, setRenameTo] = useState("");
  const [selected, setSelected] = useState<StudentSnapshot | null>(null);
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matType, setMatType] = useState<"notes" | "video" | "link">("notes");
  const [matSubject, setMatSubject] = useState("Physics");
  const [liveTitle, setLiveTitle] = useState("Doubt clearing hour");
  const [liveSubject, setLiveSubject] = useState("Physics");
  const [meetUrl, setMeetUrl] = useState("https://meet.google.com/");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [matNote, setMatNote] = useState<string | null>(null);
  const [sentRemarks, setSentRemarks] = useState<
    { studentId: string; name: string; text: string; at: number }[]
  >([]);
  const [pdfViewer, setPdfViewer] = useState<{
    title: string;
    url: string;
    id?: string;
  } | null>(null);

  // Chapter assignment state
  const [assignGrade, setAssignGrade] = useState<"10" | "11" | "12">("12");
  const [assignSubjectId, setAssignSubjectId] = useState<string>("physics");
  const [assignChapterId, setAssignChapterId] = useState<string>("");
  const [assignDeadline, setAssignDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [assignNote, setAssignNote] = useState<string>("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editDeadlineDate, setEditDeadlineDate] = useState<string>("");

  // Coding challenge manager state (CodeTantra style)
  const [codingTrack, setCodingTrack] = useState<TrackId>("all");
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [loadingCoding, setLoadingCoding] = useState(false);
  const [showAddCoding, setShowAddCoding] = useState(false);
  const [codingBusy, setCodingBusy] = useState(false);
  const [codingSuccess, setCodingSuccess] = useState<string | null>(null);

  // Coding Form fields
  const [qTitle, setQTitle] = useState("");
  const [qTrack, setQTrack] = useState<TrackId>("python");
  const [qChapterId, setQChapterId] = useState<string>("");
  const [qDifficulty, setQDifficulty] = useState<Difficulty>("easy");
  const [qTags, setQTags] = useState("");
  const [qDescription, setQDescription] = useState("");
  const [qInputFormat, setQInputFormat] = useState("");
  const [qOutputFormat, setQOutputFormat] = useState("");
  const [qConstraints, setQConstraints] = useState("");
  const [qSampleInput, setQSampleInput] = useState("");
  const [qSampleOutput, setQSampleOutput] = useState("");
  const [qExplanation, setQExplanation] = useState("");
  const [qStarterPython, setQStarterPython] = useState("");
  const [qStarterC, setQStarterC] = useState("");
  const [qStarterCpp, setQStarterCpp] = useState("");
  const [qTestCases, setQTestCases] = useState<
    Array<{ id: string; input: string; expectedOutput: string; isSecret: boolean }>
  >([
    { id: "tc_1", input: "", expectedOutput: "", isSecret: false },
    { id: "tc_2", input: "", expectedOutput: "", isSecret: true },
  ]);

  const showHomeBanner = tab === "students" || !sp.get("tab");

  const quietError = (msg: string | null) => {
    if (!msg) {
      setError(null);
      return;
    }
    // Never surface Clerk/rate-limit noise
    if (
      /too many requests|too many|429|rate.?limit|busy|resource_exhausted|temporarily delayed/i.test(
        msg
      )
    ) {
      setError(null);
      return;
    }
    setError(msg);
  };

  const refresh = useCallback(async (force = false) => {
    if (!userId) return;
    try {
      const list = await apiListMyClasses({ fresh: force });
      // NEVER wipe existing classes on empty/rate-limit response
      if (list.length) {
        // Never resurrect LIVE after End; never wipe attendanceLog
        setClasses((prev) => {
          const pickLog = (
            a?: Classroom["attendanceLog"],
            b?: Classroom["attendanceLog"]
          ) => {
            const aa = a || [];
            const bb = b || [];
            if (aa.length >= bb.length) return aa.length ? aa : bb;
            return bb;
          };
          const merged = list.map((server) => {
            const local = prev.find((p) => p.code === server.code);
            // Server ended (null) — keep ended, merge history only
            if (server.liveSession == null && local) {
              return {
                ...server,
                liveSession: null,
                attendanceLog: pickLog(
                  server.attendanceLog,
                  local.attendanceLog
                ),
              };
            }
            // Prefer server attendees when both active
            if (
              local?.liveSession?.active &&
              server.liveSession?.active
            ) {
              return {
                ...server,
                liveSession: {
                  ...server.liveSession,
                  meetUrl:
                    server.liveSession.meetUrl || local.liveSession.meetUrl,
                  attendees:
                    (server.liveSession.attendees?.length || 0) >=
                    (local.liveSession.attendees?.length || 0)
                      ? server.liveSession.attendees
                      : local.liveSession.attendees,
                },
                attendanceLog: pickLog(
                  server.attendanceLog,
                  local.attendanceLog
                ),
              };
            }
            // Keep local LIVE only for start race (<30s), not after End
            if (
              local?.liveSession?.active &&
              !server.liveSession?.active &&
              Date.now() - (local.liveSession.startedAt || 0) < 30_000
            ) {
              return {
                ...server,
                liveSession: local.liveSession,
                attendanceLog: pickLog(
                  server.attendanceLog,
                  local.attendanceLog
                ),
              };
            }
            return {
              ...server,
              attendanceLog: pickLog(
                server.attendanceLog,
                local?.attendanceLog
              ),
            };
          });
          persistClasses(merged);
          setActiveCode((prevCode) => {
            const next =
              prevCode && merged.some((c) => c.code === prevCode)
                ? prevCode
                : merged[0].code;
            const hit = merged.find((c) => c.code === next) || merged[0];
            setRoom(hit);
            return next;
          });
          return merged;
        });
        setMatNote(
          force
            ? `Refreshed · ${list.reduce((n, c) => n + (c.students?.length || 0), 0)} student(s) across classes`
            : null
        );
      } else if (force) {
        setMatNote("No update from server (busy). Showing last saved roster.");
      }
      setError(null);
    } catch {
      setError(null);
      if (force) setMatNote("Refresh delayed — try again in a few seconds.");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [userId, persistClasses]);

  useEffect(() => {
    if (!userId) return;
    if (getRole(userId) !== "teacher") {
      setRole(userId, "teacher"); // local only
    }
    let hadCache = false;
    try {
      const raw = localStorage.getItem(`sl_teacher_classes_${userId}`);
      if (raw) {
        const cached = JSON.parse(raw) as Classroom[];
        if (Array.isArray(cached) && cached.length) {
          setClasses(cached);
          setActiveCode(cached[0].code);
          setRoom(cached[0]);
          setLoading(false);
          hadCache = true;
        }
      }
    } catch {
      // ignore
    }
    // Soft background refresh at most once per 3 min (Clerk rate limits)
    const lastKey = `sl_teacher_refresh_at_${userId}`;
    const last = Number(localStorage.getItem(lastKey) || 0);
    const due = Date.now() - last > 180_000;
    if (!hadCache || due) {
      void refresh().then(() => {
        try {
          localStorage.setItem(lastKey, String(Date.now()));
        } catch {
          // ignore
        }
      });
    } else {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (room?.name) setRenameTo(room.name);
  }, [room?.code, room?.name]);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`sl_teacher_sent_remarks_${userId}`);
      if (raw) setSentRemarks(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [userId]);

  // Poll roster gently — never wipe live UI (refresh merges active live)
  useEffect(() => {
    if (!userId) return;
    if (tab !== "live" && tab !== "attendance" && tab !== "students") return;
    // Live tab: slower soft refresh so Meet card stays stable
    const ms = tab === "live" ? 45_000 : 20_000;
    const id = setInterval(() => {
      void refresh(tab !== "live");
    }, ms);
    return () => clearInterval(id);
  }, [userId, tab, refresh]);

  const fetchCodingProblems = useCallback(async () => {
    setLoadingCoding(true);
    try {
      const res = await fetch("/api/code/problems?scope=all");
      const data = await res.json();
      if (data.ok && Array.isArray(data.problems)) {
        setCodingProblems(data.problems);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCoding(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "coding") {
      void fetchCodingProblems();
    }
  }, [tab, fetchCodingProblems]);

  const addTestCase = () => {
    setQTestCases((prev) => [
      ...prev,
      {
        id: `tc_${Date.now()}_${prev.length + 1}`,
        input: "",
        expectedOutput: "",
        isSecret: prev.length >= 2,
      },
    ]);
  };

  const removeTestCase = (idx: number) => {
    setQTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTestCase = (
    idx: number,
    field: "input" | "expectedOutput" | "isSecret",
    val: string | boolean
  ) => {
    setQTestCases((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handlePublishCodingQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qDescription.trim()) {
      quietError("Title and description are required.");
      return;
    }
    setCodingBusy(true);
    setCodingSuccess(null);
    try {
      const res = await fetch("/api/code/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: qTitle.trim(),
          track: qTrack,
          difficulty: qDifficulty,
          tags: qTags,
          description: qDescription.trim(),
          inputFormat: qInputFormat.trim(),
          outputFormat: qOutputFormat.trim(),
          constraints: qConstraints.trim(),
          sampleInput: qSampleInput.trim(),
          sampleOutput: qSampleOutput.trim(),
          explanation: qExplanation.trim(),
          starterCode: {
            python: qStarterPython.trim() || undefined,
            c: qStarterC.trim() || undefined,
            cpp: qStarterCpp.trim() || undefined,
          },
          testCases: qTestCases.filter((tc) => tc.input || tc.expectedOutput),
          authorName: user?.fullName || user?.firstName || "Teacher",
          chapterId: qChapterId || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to publish question");

      setCodingSuccess(`Published "${qTitle}" successfully to students!`);
      // Reset form
      setQTitle("");
      setQChapterId("");
      setQDescription("");
      setQTags("");
      setQInputFormat("");
      setQOutputFormat("");
      setQConstraints("");
      setQSampleInput("");
      setQSampleOutput("");
      setQExplanation("");
      setQStarterPython("");
      setQStarterC("");
      setQStarterCpp("");
      setQTestCases([
        { id: "tc_1", input: "", expectedOutput: "", isSecret: false },
        { id: "tc_2", input: "", expectedOutput: "", isSecret: true },
      ]);
      setShowAddCoding(false);
      void fetchCodingProblems();
    } catch (err) {
      quietError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setCodingBusy(false);
    }
  };

  const handleDeleteCodingProblem = async (problemId: string, title: string) => {
    if (!confirm(`Delete question "${title}"? Students will no longer see this question.`)) return;
    try {
      const res = await fetch("/api/code/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: problemId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      setCodingProblems((prev) => prev.filter((p) => p.id !== problemId));
      setCodingSuccess(`Deleted question "${title}".`);
    } catch (err) {
      quietError(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  if (!isSignedIn || !userId) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        Sign in as Teacher to open this hub.
      </div>
    );
  }

  const create = async () => {
    setBusy(true);
    try {
      const c = await apiCreateClassroom(className);
      setClasses((prev) => {
        const next = [c, ...prev.filter((x) => x.code !== c.code)];
        try {
          if (userId)
            localStorage.setItem(
              `sl_teacher_classes_${userId}`,
              JSON.stringify(next)
            );
        } catch {
          // ignore
        }
        return next;
      });
      setActiveCode(c.code);
      setRoom(c);
      setRenameTo(c.name);
      router.replace("/teacher?tab=code");
    } catch (e) {
      quietError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    if (!activeCode || !renameTo.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiRenameClassroom(activeCode, renameTo.trim());
      if (!data.ok) throw new Error(data.error || "Rename failed");
      if (data.classroom) {
        setRoom(data.classroom);
        setClasses((prev) =>
          prev.map((c) =>
            c.code === data.classroom.code ? data.classroom : c
          )
        );
      }
      setMatNote("Class renamed.");
    } catch (e) {
      quietError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  };

  const removeClass = async () => {
    if (!activeCode || !room) return;
    if (
      !window.confirm(
        `Delete class “${room.name}” (${room.code})? Students will be unlinked.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await apiDeleteClassroom(activeCode);
      if (!data.ok) throw new Error(data.error || "Delete failed");
      const list = (data.classrooms || []) as Classroom[];
      persistClasses(list);
      const next = list[0] || null;
      setActiveCode(next?.code || null);
      setRoom(next);
      setRenameTo(next?.name || "");
      setMatNote("Class deleted.");
    } catch (e) {
      quietError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Broadcast for students who already linked this class (notifications)
      try {
        localStorage.setItem(
          "sl_class_code_share",
          JSON.stringify({
            code: room.code,
            name: room.name,
            at: Date.now(),
          })
        );
        // Also push into each joined student's notification channel via storage event
        for (const s of room.students || []) {
          localStorage.setItem(
            `sl_notify_student_${s.studentId}`,
            JSON.stringify({
              title: "Class code from teacher",
              body: `Join/open class ${room.name} with code ${room.code}`,
              href: "/join-class",
              at: Date.now(),
            })
          );
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  const normalizeMaterialUrl = (raw: string) => {
    let u = raw.trim();
    // Google Drive share → direct-ish view URL students can open
    const driveFile = u.match(
      /drive\.google\.com\/file\/d\/([^/]+)/i
    );
    if (driveFile) {
      return `https://drive.google.com/file/d/${driveFile[1]}/view`;
    }
    const driveOpen = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (u.includes("drive.google.com") && driveOpen) {
      return `https://drive.google.com/file/d/${driveOpen[1]}/view`;
    }
    return u;
  };

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // debounce double-submit
    if (!activeCode || !matTitle.trim()) {
      setError("Title required.");
      return;
    }
    const hasFile = !!matFile;
    const hasUrl = matUrl.trim().length > 0 && !matUrl.startsWith("data:");
    if (!hasFile && !hasUrl) {
      setError("Provide either a Drive/link OR a PDF file (up to 5MB).");
      return;
    }
    setBusy(true);
    setMatNote(null);
    setError(null);
    try {
      if (hasFile && matFile) {
        const data = await apiUploadMaterialFile({
          code: activeCode,
          title: matTitle.trim(),
          subject: matSubject.trim() || "General",
          type: matType,
          file: matFile,
        });
        const pubUrl =
          data.url ||
          (data.classroom?.materials || [])[0]?.url ||
          "";
        const durable =
          data.ok &&
          data.durable !== false &&
          !!pubUrl &&
          (pubUrl.startsWith("http://") ||
            pubUrl.startsWith("https://") ||
            pubUrl.startsWith("data:")) &&
          !pubUrl.startsWith("/api/");
        if (!durable) {
          throw new Error(
            data.error ||
              "Cloud upload failed — students would not see this file. Retry, smaller PDF, or paste a public Drive link."
          );
        }
        if (data.classroom) {
          const cls = data.classroom as Classroom;
          const seen = new Set<string>();
          cls.materials = (cls.materials || []).filter((m) => {
            const k = `${(m.title || "").toLowerCase()}|${m.url}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setRoom(cls);
          setClasses((prev) =>
            prev.map((c) => (c.code === activeCode ? cls : c))
          );
        } else {
          const mat = {
            id: `mat-${Date.now()}`,
            title: matTitle.trim(),
            subject: matSubject.trim() || "General",
            type: matType,
            url: pubUrl,
            createdAt: Date.now(),
            teacherName: user?.fullName || "Teacher",
          };
          setRoom((r) =>
            r
              ? {
                  ...r,
                  materials: [
                    mat,
                    ...(r.materials || []).filter(
                      (m) =>
                        m.url !== mat.url ||
                        (m.title || "").toLowerCase() !==
                          mat.title.toLowerCase()
                    ),
                  ],
                }
              : r
          );
        }
        const mb = (
          (data.size || matFile.size) /
          (1024 * 1024)
        ).toFixed(2);
        setMatNote(
          `Published PDF (${mb} MB) · students: Class & Notes → Refresh materials`
        );
        setMatFile(null);
        setMatTitle("");
      } else {
        const url = normalizeMaterialUrl(matUrl);
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          throw new Error("Link must start with https://");
        }
        const data = await apiAddMaterial(activeCode, {
          title: matTitle.trim(),
          url,
          type: matType,
          subject: matSubject.trim() || "General",
          teacherName: user?.fullName || "Teacher",
        });
        if (
          !data.ok &&
          !/too many|429|rate/i.test(String(data.error || ""))
        ) {
          throw new Error(data.error || "Upload failed");
        }
        if (data.classroom) setRoom(data.classroom);
        else {
          const mat = {
            id: `mat-${Date.now()}`,
            title: matTitle.trim(),
            subject: matSubject.trim() || "General",
            type: matType,
            url,
            createdAt: Date.now(),
            teacherName: user?.fullName || "Teacher",
          };
          setRoom((r) =>
            r ? { ...r, materials: [mat, ...(r.materials || [])] } : r
          );
        }
        setMatNote(`Published link · ${matSubject || "General"}`);
      }
      setMatTitle("");
      setMatUrl("");
      setMatFile(null);
      quietError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      quietError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onOfflinePdf = (file: File | null) => {
    if (!file) return;
    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      setError(
        `PDF max 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — compress or use Drive.`
      );
      return;
    }
    setError(null);
    setMatFile(file);
    setMatUrl(""); // exclusive: file OR link
    setMatType("notes");
    if (!matTitle.trim()) setMatTitle(file.name.replace(/\.pdf$/i, ""));
    setMatNote(
      `Ready: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) — click Publish`
    );
  };

  const startLive = async (schedule = false) => {
    if (!activeCode) return;
    const cleanRoomName = `smartlearn-${activeCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
    const effectiveMeetUrl =
      meetUrl.trim() || `https://meet.jit.si/${cleanRoomName}`;
    let scheduledAt: number | undefined;
    if (schedule && scheduleLocal) {
      scheduledAt = new Date(scheduleLocal).getTime();
      if (Number.isNaN(scheduledAt) || scheduledAt < Date.now()) {
        setError("Pick a future date/time to schedule.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const data = await apiStartLive(
        activeCode,
        liveTitle || "Live Class",
        liveSubject || "General",
        0,
        effectiveMeetUrl,
        scheduledAt
      );
      if (!data.ok) throw new Error(data.error || "Could not start live");
      if (data.classroom) {
        const liveRoom = data.classroom as Classroom;
        setRoom(liveRoom);
        setClasses((prev) => {
          const next = prev.map((c) =>
            c.code === activeCode ? liveRoom : c
          );
          // If class missing from list, still keep live room
          if (!next.some((c) => c.code === activeCode)) {
            next.unshift(liveRoom);
          }
          try {
            if (userId) {
              localStorage.setItem(
                `sl_teacher_classes_${userId}`,
                JSON.stringify(next)
              );
            }
          } catch {
            // ignore
          }
          return next;
        });
      }
      // Notify joined students via local broadcast key they poll
      try {
        localStorage.setItem(
          `sl_live_alert_${activeCode}`,
          JSON.stringify({
            title: liveTitle,
            meetUrl: meetUrl.trim(),
            at: Date.now(),
            scheduledAt,
          })
        );
      } catch {
        // ignore
      }
      // Don't force-refresh immediately — that was wiping live before Clerk caught up
      router.replace("/teacher?tab=live");
    } catch (err) {
      quietError(err instanceof Error ? err.message : "Live start failed");
    } finally {
      setBusy(false);
    }
  };

  const setTab = (t: TeacherTab) => router.replace(`/teacher?tab=${t}`);

  const field =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {showHomeBanner && (
        <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100">
            Teacher console
          </p>
          <h1 className="mt-1 text-3xl font-black">
            Hello{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Create a private code → share with students → see progress, mistakes
            feedback, uploads & Google Meet live.
          </p>
        </div>
      )}

      {!showHomeBanner && (
        <h1 className="text-xl font-extrabold text-slate-900">
          {tab === "materials"
            ? "Upload notes / PDF"
            : tab === "live"
              ? "Live session"
              : tab === "code"
                ? "Class code"
                : tab === "attendance"
                  ? "Attendance"
                  : tab === "chapters"
                    ? "Unlock Chapters & Deadlines"
                    : tab === "coding"
                      ? "Coding Challenges (CodeTantra Engine)"
                      : "Teacher"}
        </h1>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {showHomeBanner && (
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className={field}
          placeholder="New class name"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GraduationCap className="h-4 w-4" />
          )}
          Create class + code
        </button>
        <button
          type="button"
          onClick={() => {
            setBusy(true);
            void refresh(true);
          }}
          disabled={busy || loading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          {busy ? "Refreshing…" : "Refresh roster"}
        </button>
        {classes.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => {
              selectClass(c.code);
            }}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-bold transition",
              activeCode === c.code
                ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
            )}
          >
            {c.name} · {c.code}
          </button>
        ))}
      </div>
      )}

      {!showHomeBanner && classes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {classes.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                selectClass(c.code);
              }}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                activeCode === c.code
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 text-slate-500"
              )}
            >
              {c.code}
            </button>
          ))}
        </div>
      )}

      {loading && classes.length === 0 ? (
        <div className="mt-10 flex justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-slate-500">
          Create your first class to get a <strong>private code</strong> students
          can join from any phone.
        </div>
      ) : !room ? (
        <div className="mt-8 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center text-sm text-amber-900">
          Select a class chip above to manage it.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_300px]">
          <div>
            {/* Class management tab navigation */}
            <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200">
              {(
                [
                  ["students", "Students"],
                  ["chapters", "Chapter Deadlines"],
                  ["coding", "Coding Challenges"],
                  ["materials", "Upload"],
                  ["live", "Live"],
                  ["attendance", "Attendance"],
                  ["code", "Class code"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-xl px-3.5 py-2 text-xs font-bold transition",
                    tab === id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "code" && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">
                    Private class code for{" "}
                    <strong className="text-slate-900">{room.name}</strong>
                  </p>
                  <p className="mt-4 font-mono text-5xl font-black tracking-[0.35em] text-indigo-700">
                    {room.code}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Students open <strong>Join Teacher</strong> and type this
                    code (any device). Then they appear under Students.
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy code"}
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Pencil className="h-4 w-4 text-indigo-600" /> Manage class
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={renameTo}
                      onChange={(e) => setRenameTo(e.target.value)}
                      placeholder="Class name"
                      className={`${field} min-w-[180px] flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => void rename()}
                      disabled={busy || !renameTo.trim()}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeClass()}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete class
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "students" && (
              <div className="space-y-3">
                {room.students.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                    No students yet. Share{" "}
                    <strong className="font-mono text-indigo-700">
                      {room.code}
                    </strong>
                    . Empty until someone joins — no sample data.
                  </div>
                )}
                {room.students.map((s) => (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={cn(
                      "sl-card w-full rounded-2xl border border-white/80 bg-white/80 p-4 text-left shadow-sm",
                      selected?.studentId === s.studentId &&
                        "border-indigo-300 ring-2 ring-indigo-100"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Class {s.grade} · {s.email || "no email"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Joined{" "}
                          {new Date(
                            s.joinedAt || s.lastActive
                          ).toLocaleString()}
                          {" · "}
                          Active{" "}
                          {new Date(s.lastActive).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 text-[11px] font-bold">
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                          {s.xp} XP
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                          {s.accuracy ?? 0}%
                        </span>
                        <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                          {s.mistakes} mistakes
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Weak:{" "}
                      <strong className="text-rose-700">
                        {s.weakSubjects.join(", ") || "—"}
                      </strong>
                      {" · "}Chapters opened: {s.chaptersOpened}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tab === "materials" && (
              <div className="space-y-4">
                <form
                  onSubmit={(e) => void upload(e)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Upload className="h-4 w-4 text-indigo-600" /> Upload notes /
                    PDF
                  </h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      placeholder="Title"
                      className={field}
                      required
                    />
                    <input
                      value={matSubject}
                      onChange={(e) => setMatSubject(e.target.value)}
                      placeholder="Subject"
                      className={field}
                    />
                    <select
                      value={matType}
                      onChange={(e) =>
                        setMatType(e.target.value as "notes" | "video" | "link")
                      }
                      className={field}
                    >
                      <option value="notes">Notes / PDF</option>
                      <option value="video">Video lecture link</option>
                      <option value="link">Other link</option>
                    </select>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                      <Upload className="h-3.5 w-3.5" /> Offline PDF from device
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          onOfflinePdf(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <input
                      value={matFile ? "" : matUrl}
                      onChange={(e) => {
                        setMatUrl(e.target.value);
                        if (e.target.value.trim()) setMatFile(null);
                      }}
                      placeholder="Or paste https:// Drive / YouTube link"
                      className={`${field} sm:col-span-2`}
                      disabled={!!matFile}
                    />
                    <p className="sm:col-span-2 text-[10px] text-slate-400">
                      PDF from device up to <strong>5 MB</strong>, or a Drive
                      link — one is enough.
                    </p>
                    {matFile && (
                      <p className="sm:col-span-2 text-[11px] font-semibold text-emerald-700">
                        PDF ready: {matFile.name} (
                        {(matFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  {matNote && (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      {matNote}
                    </p>
                  )}
                  {error && tab === "materials" && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busy ? "Uploading…" : "Publish to class"}
                  </button>
                </form>
                <ul className="space-y-2">
                  {(room.materials || []).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {m.type === "video" ? (
                            <Video className="mr-1 inline h-3.5 w-3.5 text-rose-500" />
                          ) : (
                            <BookOpen className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                          )}
                          {m.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.subject}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const u = m.url || "";
                          if (!u) return;
                          if (
                            m.type === "video" ||
                            m.type === "link" ||
                            /^https?:\/\/(www\.)?(youtube|youtu\.be|meet\.google)/i.test(
                              u
                            )
                          ) {
                            window.open(u, "_blank", "noopener,noreferrer");
                            return;
                          }
                          setPdfViewer({
                            title: m.title || "Class PDF",
                            url: u,
                            id: m.id,
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "attendance" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />{" "}
                    Session attendance
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Students are marked present when they open Live Class during
                    an active session. Use{" "}
                    <strong>Refresh roster</strong> to load the latest list.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void refresh(true);
                    }}
                    className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-800"
                  >
                    {busy ? "Refreshing…" : "Refresh attendance"}
                  </button>
                </div>
                {room.liveSession?.active && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                    <div className="text-sm font-bold text-rose-800">
                      LIVE now · {room.liveSession.title} ·{" "}
                      {room.liveSession.subject}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {(room.liveSession.attendees || []).length === 0 && (
                        <li className="text-xs text-rose-600/80">
                          No one joined yet — ask students to open Live Class.
                        </li>
                      )}
                      {(room.liveSession.attendees || []).map((a) => (
                        <li
                          key={a.studentId + a.joinedAt}
                          className="flex flex-wrap justify-between gap-1 rounded-lg bg-white/80 px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            {a.name}
                          </span>
                          <span className="text-slate-400">
                            in {new Date(a.joinedAt).toLocaleTimeString()}
                            {a.leftAt
                              ? ` · out ${new Date(a.leftAt).toLocaleTimeString()}`
                              : " · still in"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-3">
                  {(room.attendanceLog || []).length === 0 &&
                    !room.liveSession?.active && (
                      <li className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                        No sessions yet. Start a live class; when students open
                        Live Class they appear here. Then End session to close
                        the log.
                      </li>
                    )}
                  {(room.attendanceLog || []).map((rec) => (
                    <li
                      key={rec.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {rec.sessionTitle}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rec.subject} ·{" "}
                            {new Date(rec.startedAt).toLocaleString()}
                            {rec.endedAt
                              ? ` → ${new Date(rec.endedAt).toLocaleTimeString()}`
                              : " · open"}
                          </div>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                          {rec.attendees?.length || 0} present
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {(rec.attendees || []).map((a) => (
                          <li
                            key={a.studentId + a.joinedAt}
                            className="flex flex-wrap justify-between gap-1 text-xs text-slate-600"
                          >
                            <span>{a.name}</span>
                            <span className="text-slate-400">
                              in {new Date(a.joinedAt).toLocaleTimeString()}
                              {a.leftAt
                                ? ` · out ${new Date(a.leftAt).toLocaleTimeString()}`
                                : ""}
                            </span>
                          </li>
                        ))}
                        {(rec.attendees || []).length === 0 && (
                          <li className="text-[11px] text-slate-400">
                            Nobody marked present
                          </li>
                        )}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "live" && (
              <div className="space-y-4">
                {!room.liveSession?.active ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Radio className="h-4 w-4 text-rose-500" /> Start Google
                      Meet live
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        value={liveTitle}
                        onChange={(e) => setLiveTitle(e.target.value)}
                        placeholder="Session title (e.g. Unit 3 Live Class)"
                        className={field}
                      />
                      <input
                        value={liveSubject}
                        onChange={(e) => setLiveSubject(e.target.value)}
                        placeholder="Subject (e.g. Data Structures)"
                        className={field}
                      />
                      <input
                        value={meetUrl}
                        onChange={(e) => setMeetUrl(e.target.value)}
                        placeholder="Optional: Custom Google Meet link (leave blank for built-in in-app video)"
                        className={`${field} sm:col-span-2`}
                      />
                      <label className="sm:col-span-2 text-[11px] font-semibold text-slate-600">
                        Schedule for later (optional)
                        <input
                          type="datetime-local"
                          value={scheduleLocal}
                          onChange={(e) => setScheduleLocal(e.target.value)}
                          className={`${field} mt-1 w-full`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void startLive(false)}
                        disabled={busy}
                        className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500"
                      >
                        Start In-App Live Class
                      </button>
                      <button
                        type="button"
                        onClick={() => void startLive(true)}
                        disabled={busy || !scheduleLocal}
                        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 hover:bg-indigo-500"
                      >
                        Schedule meeting
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      ⚡ <strong>Native In-App Live Video:</strong> Students and teachers join directly inside SmartLearn with WebRTC HD video, audio, and screen sharing. Zero external logins required. Leave the meet URL blank to use built-in video automatically.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-rose-800">
                          LIVE · {room.liveSession.title}
                        </div>
                        <div className="text-xs text-rose-600">
                          Open-ended · Meet + student banner stay until End
                          session
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            try {
                              const data = await apiEndLive(room.code);
                              const next = (data.classroom || {
                                ...room,
                                liveSession: null,
                              }) as Classroom;
                              // Keep attendance forever after end
                              const cleared = {
                                ...next,
                                liveSession: null,
                                attendanceLog:
                                  next.attendanceLog?.length
                                    ? next.attendanceLog
                                    : room.attendanceLog || [],
                              };
                              setRoom(cleared);
                              setClasses((prev) =>
                                prev.map((c) =>
                                  c.code === room.code ? cleared : c
                                )
                              );
                              try {
                                localStorage.removeItem(
                                  `sl_live_alert_${room.code}`
                                );
                                if (userId) {
                                  localStorage.setItem(
                                    `sl_teacher_classes_${userId}`,
                                    JSON.stringify(
                                      (classes || []).map((c) =>
                                        c.code === room.code ? cleared : c
                                      )
                                    )
                                  );
                                }
                              } catch {
                                // ignore
                              }
                              setMatNote("Live session ended.");
                              void refresh(true);
                            } catch (e) {
                              quietError(
                                e instanceof Error
                                  ? e.message
                                  : "Could not end session"
                              );
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {busy ? "Ending…" : "End session"}
                      </button>
                    </div>
                    <div className="mt-3">
                      <MeetFrame
                        meetUrl={room.liveSession.meetUrl || ""}
                        roomCode={room.code}
                        isTeacher={true}
                        displayName={user?.fullName || "Teacher"}
                        title={`Teacher · ${room.liveSession.title}`}
                        subject={room.liveSession.subject}
                      />
                    </div>
                    <div className="mt-3 rounded-xl border border-white bg-white/80 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>
                          Live attendees ({room.liveSession.attendees?.length || 0} students)
                        </span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Auto-refreshed in real time
                        </span>
                      </div>
                      {(room.liveSession.attendees || []).length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">
                          No students joined yet. When students open Live Class, their attendance is recorded instantly.
                        </p>
                      ) : (
                        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                          {(room.liveSession.attendees || []).map((a) => (
                            <li
                              key={a.studentId + a.joinedAt}
                              className="flex justify-between rounded bg-slate-50 px-2 py-1 text-xs text-slate-600"
                            >
                              <span className="font-semibold text-slate-800">
                                {a.name}
                              </span>
                              <span className="text-slate-400">
                                in {new Date(a.joinedAt).toLocaleTimeString()}
                                {a.leftAt
                                  ? ` · left ${new Date(a.leftAt).toLocaleTimeString()}`
                                  : " · present"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "chapters" && (
              <div className="space-y-6">
                {/* Header card */}
                <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                        <CalendarCheck className="h-5 w-5 text-indigo-600" />
                        Unlock Chapters & Target Deadlines
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Select which subject chapters students in <strong>{room.name}</strong> can access, set completion target dates, and extend dates if students need more time.
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                      {(room.chapterAssignments || []).length} Chapters Unlocked
                    </span>
                  </div>

                  {/* Unlock Chapter Form */}
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Unlock a new chapter
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Grade Selector */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500">
                          Grade / Class
                        </label>
                        <select
                          value={assignGrade}
                          onChange={(e) => {
                            const g = e.target.value as "10" | "11" | "12";
                            setAssignGrade(g);
                            const pack = CURRICULUM.find((p) => p.grade === g);
                            if (pack && pack.subjects.length > 0) {
                              setAssignSubjectId(pack.subjects[0].id);
                              if (pack.subjects[0].chapters.length > 0) {
                                setAssignChapterId(pack.subjects[0].chapters[0].id);
                              }
                            }
                          }}
                          className={`${field} mt-1 w-full text-xs font-medium`}
                        >
                          <option value="10">Class 10</option>
                          <option value="11">Class 11</option>
                          <option value="12">Class 12</option>
                        </select>
                      </div>

                      {/* Subject Selector */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500">
                          Subject
                        </label>
                        <select
                          value={assignSubjectId}
                          onChange={(e) => {
                            const sid = e.target.value;
                            setAssignSubjectId(sid);
                            const pack = CURRICULUM.find((p) => p.grade === assignGrade);
                            const sub = pack?.subjects.find((s) => s.id === sid);
                            if (sub && sub.chapters.length > 0) {
                              setAssignChapterId(sub.chapters[0].id);
                            }
                          }}
                          className={`${field} mt-1 w-full text-xs font-medium`}
                        >
                          {(
                            CURRICULUM.find((p) => p.grade === assignGrade)?.subjects ||
                            []
                          ).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Chapter Selector */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500">
                          Chapter
                        </label>
                        <select
                          value={
                            assignChapterId ||
                            CURRICULUM.find((p) => p.grade === assignGrade)
                              ?.subjects.find((s) => s.id === assignSubjectId)
                              ?.chapters[0]?.id ||
                            ""
                          }
                          onChange={(e) => setAssignChapterId(e.target.value)}
                          className={`${field} mt-1 w-full text-xs font-medium`}
                        >
                          {(
                            CURRICULUM.find((p) => p.grade === assignGrade)
                              ?.subjects.find((s) => s.id === assignSubjectId)
                              ?.chapters || []
                          ).map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              Ch {ch.number}: {ch.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Target Deadline Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500">
                          Completion Deadline
                        </label>
                        <input
                          type="date"
                          value={assignDeadline}
                          onChange={(e) => setAssignDeadline(e.target.value)}
                          className={`${field} mt-1 w-full text-xs font-medium`}
                        />
                      </div>
                    </div>

                    {/* Optional Note & Submit Button */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={assignNote}
                        onChange={(e) => setAssignNote(e.target.value)}
                        placeholder="Optional instructions for students (e.g. Complete exercises & NCERT reading)"
                        className={`${field} flex-1 text-xs`}
                      />
                      <button
                        type="button"
                        disabled={assignBusy}
                        onClick={async () => {
                          const pack = CURRICULUM.find((p) => p.grade === assignGrade);
                          const sub =
                            pack?.subjects.find((s) => s.id === assignSubjectId) ||
                            pack?.subjects[0];
                          if (!sub) return;
                          const targetChId =
                            assignChapterId || sub.chapters[0]?.id;
                          const chObj =
                            sub.chapters.find((c) => c.id === targetChId) ||
                            sub.chapters[0];
                          if (!chObj) return;

                          setAssignBusy(true);
                          try {
                            const res = await apiAssignChapter(room.code, {
                              grade: assignGrade,
                              subjectId: sub.id,
                              subjectName: sub.name,
                              chapterId: chObj.id,
                              chapterNumber: chObj.number,
                              chapterTitle: chObj.title,
                              deadline: assignDeadline,
                              note: assignNote.trim() || undefined,
                            });
                            if (res.ok && res.assignment) {
                              const updatedAssignments = [
                                res.assignment,
                                ...(room.chapterAssignments || []).filter(
                                  (a) => a.chapterId !== chObj.id
                                ),
                              ];
                              const nextRoom = {
                                ...room,
                                chapterAssignments: updatedAssignments,
                              };
                              setRoom(nextRoom);
                              persistClasses(
                                classes.map((c) =>
                                  c.code === room.code ? nextRoom : c
                                )
                              );
                              setMatNote(`Unlocked "${chObj.title}" for students with deadline ${assignDeadline}.`);
                              setAssignNote("");
                            }
                          } catch (e) {
                            quietError(
                              e instanceof Error ? e.message : "Failed to assign chapter"
                            );
                          } finally {
                            setAssignBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {assignBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                        Unlock & Set Deadline
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Chapter Assignments List */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Currently Allowed Chapters ({room.chapterAssignments?.length || 0})
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Students will only see and access these chapters in their NCERT & Practice modules. You can modify deadlines or revoke access anytime.
                  </p>

                  {(!room.chapterAssignments || room.chapterAssignments.length === 0) ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <Lock className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        No chapters unlocked yet.
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Use the form above to unlock chapters for Class {room.name}.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                      {room.chapterAssignments.map((a) => {
                        const isEditing = editingChapterId === a.chapterId;
                        const todayStr = new Date().toISOString().split("T")[0];
                        const isOverdue = a.deadline < todayStr;
                        const isDueToday = a.deadline === todayStr;

                        return (
                          <div
                            key={a.id || a.chapterId}
                            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                  Class {a.grade} · {a.subjectName}
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  Ch {a.chapterNumber}: {a.chapterTitle}
                                </span>
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                    <AlertCircle className="h-3 w-3" /> Overdue ({a.deadline})
                                  </span>
                                ) : isDueToday ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    <Clock className="h-3 w-3" /> Due Today ({a.deadline})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> Target: {a.deadline}
                                  </span>
                                )}
                              </div>
                              {a.note && (
                                <p className="mt-1 text-xs text-slate-500 italic">
                                  Note: {a.note}
                                </p>
                              )}
                              {a.updatedAt && (
                                <p className="text-[10px] text-slate-400">
                                  Deadline updated {new Date(a.updatedAt).toLocaleDateString()}
                                </p>
                              )}

                              {/* Inline Date Modifier */}
                              {isEditing && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
                                  <span className="text-xs font-bold text-indigo-900">
                                    New Target Date:
                                  </span>
                                  <input
                                    type="date"
                                    value={editDeadlineDate}
                                    onChange={(e) => setEditDeadlineDate(e.target.value)}
                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                                  />
                                  <button
                                    type="button"
                                    disabled={!editDeadlineDate}
                                    onClick={async () => {
                                      if (!editDeadlineDate) return;
                                      try {
                                        const res = await apiUpdateChapterDeadline(
                                          room.code,
                                          a.chapterId,
                                          editDeadlineDate
                                        );
                                        if (res.ok && res.assignment) {
                                          const nextAssignments = (room.chapterAssignments || []).map(
                                            (item) =>
                                              item.chapterId === a.chapterId
                                                ? res.assignment
                                                : item
                                          );
                                          const nextRoom = {
                                            ...room,
                                            chapterAssignments: nextAssignments,
                                          };
                                          setRoom(nextRoom);
                                          persistClasses(
                                            classes.map((c) =>
                                              c.code === room.code ? nextRoom : c
                                            )
                                          );
                                          setEditingChapterId(null);
                                          setMatNote(`Updated deadline for Ch ${a.chapterNumber} to ${editDeadlineDate}.`);
                                        }
                                      } catch (err) {
                                        quietError(
                                          err instanceof Error
                                            ? err.message
                                            : "Failed to update deadline"
                                        );
                                      }
                                    }}
                                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                                  >
                                    Save New Date
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingChapterId(null)}
                                    className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChapterId(a.chapterId);
                                    setEditDeadlineDate(a.deadline);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Modify Date
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Lock Chapter ${a.chapterNumber}: ${a.chapterTitle}? Students will no longer see this chapter.`
                                    )
                                  )
                                    return;
                                  try {
                                    await apiRemoveChapterAssignment(
                                      room.code,
                                      a.chapterId
                                    );
                                    const nextAssignments = (room.chapterAssignments || []).filter(
                                      (item) => item.chapterId !== a.chapterId
                                    );
                                    const nextRoom = {
                                      ...room,
                                      chapterAssignments: nextAssignments,
                                    };
                                    setRoom(nextRoom);
                                    persistClasses(
                                      classes.map((c) =>
                                        c.code === room.code ? nextRoom : c
                                      )
                                    );
                                    setMatNote(`Locked Chapter ${a.chapterNumber} for students.`);
                                  } catch (err) {
                                    quietError(
                                      err instanceof Error
                                        ? err.message
                                        : "Failed to lock chapter"
                                    );
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Lock
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "coding" && (
              <div className="space-y-6">
                {/* Feedback message */}
                {codingSuccess && (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                    <span>{codingSuccess}</span>
                    <button
                      type="button"
                      onClick={() => setCodingSuccess(null)}
                      className="ml-3 font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Top Coding Hub Header */}
                <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Code2 className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-lg font-black text-slate-900">
                          Coding Challenges (CodeTantra Engine)
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                        Upload coding questions for Python, C, C++, and DSA. Configure public and hidden test cases for automated CodeTantra-style evaluation.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href="/code"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Student IDE
                      </Link>

                      <button
                        type="button"
                        onClick={() => setShowAddCoding((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {showAddCoding ? "Close Form" : "Upload New Question"}
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {(
                      [
                        ["all", "All Tracks"],
                        ["python", "Python 🐍"],
                        ["c", "C ⚡"],
                        ["cpp", "C++ 🚀"],
                        ["dsa", "DSA 🧠"],
                      ] as const
                    ).map(([id, label]) => {
                      const count =
                        id === "all"
                          ? codingProblems.length
                          : codingProblems.filter((p) => p.track === id).length;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCodingTrack(id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                            codingTrack === id
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          <span>{label}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[10px]",
                              codingTrack === id
                                ? "bg-white/25 text-white"
                                : "bg-white text-slate-600"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Upload Form */}
                {showAddCoding && (
                  <form
                    onSubmit={handlePublishCodingQuestion}
                    className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-md space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Upload New Coding Question
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Fill problem details and test cases. Question will be immediately available in the Student Coding Section.
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                        CodeTantra Automated Evaluator
                      </span>
                    </div>

                    {/* Basic Meta */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600">
                          Problem Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={qTitle}
                          onChange={(e) => setQTitle(e.target.value)}
                          placeholder="e.g. Reverse an Array / Palindrome Check"
                          className={cn(field, "w-full mt-1")}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600">
                          Category / Track *
                        </label>
                        <select
                          value={qTrack}
                          onChange={(e) => setQTrack(e.target.value as TrackId)}
                          className={cn(field, "w-full mt-1")}
                        >
                          <option value="python">Python 🐍</option>
                          <option value="c">C Language ⚡</option>
                          <option value="cpp">C++ 🚀</option>
                          <option value="dsa">DSA (Data Structures) 🧠</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600">
                          Difficulty *
                        </label>
                        <select
                          value={qDifficulty}
                          onChange={(e) => setQDifficulty(e.target.value as Difficulty)}
                          className={cn(field, "w-full mt-1")}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600">
                          Assign to Syllabus Chapter (Optional)
                        </label>
                        <select
                          value={qChapterId}
                          onChange={(e) => setQChapterId(e.target.value)}
                          className={cn(field, "w-full mt-1")}
                        >
                          <option value="">General Track Challenge</option>
                          {CODING_CURRICULUM[qTrack as "python" | "c" | "cpp" | "dsa"]?.units?.flatMap(
                            (u) =>
                              u.chapters.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  Unit {u.unitNumber} · Ch {ch.chapterNumber}: {ch.title}
                                </option>
                              ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">
                        Topic Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={qTags}
                        onChange={(e) => setQTags(e.target.value)}
                        placeholder="e.g. Arrays, Strings, CBSE Class 11, Two Pointers"
                        className={cn(field, "w-full mt-1")}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">
                        Problem Statement / Description *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={qDescription}
                        onChange={(e) => setQDescription(e.target.value)}
                        placeholder="Explain the problem clearly with requirements, input rules, and expected behavior..."
                        className={cn(field, "w-full mt-1 font-mono text-xs")}
                      />
                    </div>

                    {/* Input/Output/Constraints */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">
                          Input Format
                        </label>
                        <textarea
                          rows={2}
                          value={qInputFormat}
                          onChange={(e) => setQInputFormat(e.target.value)}
                          placeholder="e.g. First line contains an integer T..."
                          className={cn(field, "w-full mt-1 text-xs")}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">
                          Output Format
                        </label>
                        <textarea
                          rows={2}
                          value={qOutputFormat}
                          onChange={(e) => setQOutputFormat(e.target.value)}
                          placeholder="e.g. Print True if palindrome else False"
                          className={cn(field, "w-full mt-1 text-xs")}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">
                          Constraints
                        </label>
                        <textarea
                          rows={2}
                          value={qConstraints}
                          onChange={(e) => setQConstraints(e.target.value)}
                          placeholder="e.g. 1 <= N <= 10^5"
                          className={cn(field, "w-full mt-1 text-xs font-mono")}
                        />
                      </div>
                    </div>

                    {/* Sample Case */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        Sample Case (Visible to Students)
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Sample Input (STDIN)
                          </label>
                          <textarea
                            rows={2}
                            value={qSampleInput}
                            onChange={(e) => setQSampleInput(e.target.value)}
                            placeholder="5&#10;1 2 3 4 5"
                            className={cn(field, "w-full mt-1 font-mono text-xs")}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Sample Output (Expected STDOUT)
                          </label>
                          <textarea
                            rows={2}
                            value={qSampleOutput}
                            onChange={(e) => setQSampleOutput(e.target.value)}
                            placeholder="15"
                            className={cn(field, "w-full mt-1 font-mono text-xs")}
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="text-[11px] font-bold text-slate-600">
                          Explanation (Optional)
                        </label>
                        <input
                          type="text"
                          value={qExplanation}
                          onChange={(e) => setQExplanation(e.target.value)}
                          placeholder="Brief reason for why this output is expected"
                          className={cn(field, "w-full mt-1 text-xs")}
                        />
                      </div>
                    </div>

                    {/* Test Cases Builder (CodeTantra Style) */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-indigo-900">
                            Evaluation Test Cases ({qTestCases.length})
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Students will run their code against these test cases to verify their solution.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addTestCase}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          <Plus className="h-3 w-3" /> Add Test Case
                        </button>
                      </div>

                      <div className="space-y-3">
                        {qTestCases.map((tc, idx) => (
                          <div
                            key={tc.id || idx}
                            className="rounded-xl border border-indigo-100 bg-white p-3 shadow-xs space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-800">
                                Test Case #{idx + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={tc.isSecret}
                                    onChange={(e) =>
                                      updateTestCase(idx, "isSecret", e.target.checked)
                                    }
                                    className="rounded border-slate-300 text-indigo-600"
                                  />
                                  <span>Hidden Test Case 🔒</span>
                                </label>
                                {qTestCases.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTestCase(idx)}
                                    className="text-rose-500 hover:text-rose-700 text-xs"
                                    title="Remove test case"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  STDIN Input
                                </span>
                                <textarea
                                  rows={2}
                                  value={tc.input}
                                  onChange={(e) =>
                                    updateTestCase(idx, "input", e.target.value)
                                  }
                                  placeholder="Input provided to student program"
                                  className={cn(field, "w-full mt-0.5 font-mono text-[11px]")}
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  Expected STDOUT Output
                                </span>
                                <textarea
                                  rows={2}
                                  value={tc.expectedOutput}
                                  onChange={(e) =>
                                    updateTestCase(idx, "expectedOutput", e.target.value)
                                  }
                                  placeholder="Exact expected output"
                                  className={cn(field, "w-full mt-0.5 font-mono text-[11px]")}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Starter Code Templates (Optional) */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        Custom Starter Code (Optional - Default provided if left blank)
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Python Starter
                          </label>
                          <textarea
                            rows={3}
                            value={qStarterPython}
                            onChange={(e) => setQStarterPython(e.target.value)}
                            placeholder="import sys..."
                            className={cn(field, "w-full mt-1 font-mono text-[11px]")}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            C Starter
                          </label>
                          <textarea
                            rows={3}
                            value={qStarterC}
                            onChange={(e) => setQStarterC(e.target.value)}
                            placeholder="#include <stdio.h>..."
                            className={cn(field, "w-full mt-1 font-mono text-[11px]")}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            C++ Starter
                          </label>
                          <textarea
                            rows={3}
                            value={qStarterCpp}
                            onChange={(e) => setQStarterCpp(e.target.value)}
                            placeholder="#include <iostream>..."
                            className={cn(field, "w-full mt-1 font-mono text-[11px]")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCoding(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={codingBusy}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {codingBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Publish Question to Students
                      </button>
                    </div>
                  </form>
                )}

                {/* Published Questions List */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Coding Question Repository
                      </h3>
                      <p className="text-xs text-slate-500">
                        {codingTrack === "all"
                          ? "Showing questions across all programming tracks"
                          : `Showing questions for ${codingTrack.toUpperCase()} track`}
                      </p>
                    </div>
                    {loadingCoding && (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    )}
                  </div>

                  {(() => {
                    const displayed =
                      codingTrack === "all"
                        ? codingProblems
                        : codingProblems.filter((p) => p.track === codingTrack);

                    if (displayed.length === 0) {
                      return (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                          <FileCode className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            No questions found in this category.
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Click &ldquo;Upload New Question&rdquo; above to add one.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-slate-100">
                        {displayed.map((prob) => {
                          const isTeacher = prob.source === "teacher";
                          const secretCount = (prob.testCases || []).filter(
                            (tc) => tc.isSecret
                          ).length;

                          return (
                            <div
                              key={prob.id}
                              className="flex flex-wrap items-center justify-between gap-4 py-4"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                                    {prob.track}
                                  </span>

                                  <span
                                    className={cn(
                                      "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                                      prob.difficulty === "easy"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : prob.difficulty === "medium"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-rose-50 text-rose-700"
                                    )}
                                  >
                                    {prob.difficulty}
                                  </span>

                                  {isTeacher && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200">
                                      👨‍🏫 Teacher Uploaded
                                    </span>
                                  )}

                                  <span className="text-sm font-bold text-slate-900">
                                    {prob.title}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500 line-clamp-2">
                                  {prob.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                  <span>
                                    ⚡ {prob.testCases?.length || 0} Test Cases
                                    {secretCount > 0 ? ` (${secretCount} hidden 🔒)` : ""}
                                  </span>
                                  {prob.tags && prob.tags.length > 0 && (
                                    <span>• Tags: {prob.tags.slice(0, 3).join(", ")}</span>
                                  )}
                                  {prob.authorName && (
                                    <span>• By: {prob.authorName}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/code?problem=${prob.id}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Test in IDE
                                </Link>

                                {isTeacher && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteCodingProblem(prob.id, prob.title)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
                                    title="Delete this question"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold">
                <Users className="h-4 w-4 text-indigo-600" /> Student detail
              </h3>
              {!selected ? (
                <p className="mt-3 text-xs text-slate-400">
                  Select a joined student.
                </p>
              ) : (
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="text-base font-bold text-slate-900">
                    {selected.name}
                  </div>
                  <div>{selected.email || "—"}</div>
                  <div>
                    Streak {selected.streak}d · XP {selected.xp} · Accuracy{" "}
                    {selected.accuracy ?? 0}%
                  </div>
                  <div>
                    Weak:{" "}
                    <strong className="text-rose-700">
                      {selected.weakSubjects.join(", ") || "—"}
                    </strong>
                  </div>
                  <div className="pt-2 font-bold text-slate-800">
                    Recent mistakes
                  </div>
                  <ul className="space-y-2">
                    {selected.recentMistakes.map((m, i) => (
                      <li
                        key={i}
                        className="rounded-xl bg-rose-50 px-2 py-2 text-[11px] text-rose-900"
                      >
                        <div className="font-semibold">
                          {m.subjectName} · {m.chapterTitle}
                        </div>
                        <div className="opacity-80">{m.prompt}</div>
                      </li>
                    ))}
                    {selected.recentMistakes.length === 0 && (
                      <li className="text-slate-400">No mistakes yet.</li>
                    )}
                  </ul>
                  <div className="pt-3">
                    <div className="font-bold text-slate-800">
                      Teacher feedback
                    </div>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      placeholder={`Feedback for ${selected.name} on weak topics…`}
                      className={`${field} mt-1 w-full text-xs`}
                    />
                    {sentRemarks.filter((r) => r.studentId === selected.studentId)
                      .length > 0 && (
                      <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                        {sentRemarks
                          .filter((r) => r.studentId === selected.studentId)
                          .slice(0, 5)
                          .map((r, i) => (
                            <li
                              key={i}
                              className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] text-indigo-900"
                            >
                              {new Date(r.at).toLocaleString()}: {r.text}
                            </li>
                          ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!feedback.trim() || !selected) return;
                        void (async () => {
                          try {
                            const data = await apiSendRemark(
                              selected.studentId,
                              feedback.trim(),
                              room?.code,
                              room?.name
                            );
                            if (!data.ok) {
                              throw new Error(data.error || "Send failed");
                            }
                            const entry = {
                              studentId: selected.studentId,
                              name: selected.name,
                              text: feedback.trim(),
                              at: Date.now(),
                            };
                            setSentRemarks((prev) => {
                              const next = [entry, ...prev].slice(0, 40);
                              try {
                                localStorage.setItem(
                                  `sl_teacher_sent_remarks_${userId}`,
                                  JSON.stringify(next)
                                );
                              } catch {
                                // ignore
                              }
                              return next;
                            });
                            setFeedback("");
                            setMatNote(
                              `Remark sent to ${selected.name} (saved here + student Remarks)`
                            );
                          } catch (e) {
                            quietError(
                              e instanceof Error
                                ? e.message
                                : "Could not send feedback"
                            );
                          }
                        })();
                      }}
                      className="mt-2 w-full rounded-lg bg-indigo-600 py-1.5 text-[11px] font-bold text-white"
                    >
                      Send remark to student
                    </button>
                  </div>
                </div>
              )}
            </div>

          </aside>
        </div>
      )}

      <PdfReaderModal
        open={Boolean(pdfViewer)}
        title={pdfViewer?.title || "PDF"}
        ncertLink={pdfViewer?.url}
        classCode={activeCode || undefined}
        materialId={pdfViewer?.id}
        onClose={() => setPdfViewer(null)}
      />
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm">Loading teacher hub…</div>}>
      <TeacherInner />
    </Suspense>
  );
}
