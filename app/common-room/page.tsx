"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  BookOpen,
  ChevronDown,
  Clock,
  GraduationCap,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Reply,
  Shield,
  Users,
  X,
  ZoomIn,
} from "lucide-react";
import { pushNotification } from "@/lib/notifications";
import { displayName } from "@/lib/display-name";
import {
  apiListMyClasses,
  getJoinedClasses,
  getRole,
  readJoinedRoomMeta,
  type Classroom,
} from "@/lib/teacher-store";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  classCode: string;
  className?: string;
  author: string;
  authorId?: string;
  role?: "teacher" | "student";
  text: string;
  imageDataUrl?: string;
  replyToId?: string;
  replyToAuthor?: string;
  replyToText?: string;
  at: number;
};

type ClassroomItem = {
  code: string;
  name: string;
  teacherName?: string;
};

const COOLDOWN_SEC = 15;
const MAX_CHARS = 300;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function localCacheKey(code: string) {
  return `sl_cr_cache_${code.trim().toUpperCase()}`;
}

function keepFresh(list: Msg[]) {
  const cut = Date.now() - SEVEN_DAYS;
  return list.filter((m) => (m.at || 0) >= cut);
}

function buildThreads(list: Msg[]): { root: Msg; replies: Msg[] }[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  const children = new Map<string, Msg[]>();
  for (const m of list) {
    if (!m.replyToId || !byId.has(m.replyToId)) continue;
    const arr = children.get(m.replyToId) || [];
    arr.push(m);
    children.set(m.replyToId, arr);
  }
  const collect = (id: string, acc: Msg[] = []): Msg[] => {
    const kids = (children.get(id) || []).slice().sort((a, b) => a.at - b.at);
    for (const k of kids) {
      acc.push(k);
      collect(k.id, acc);
    }
    return acc;
  };
  const roots = list
    .filter((m) => !m.replyToId || !byId.has(m.replyToId))
    .slice()
    .sort((a, b) => b.at - a.at);
  return roots.map((root) => ({ root, replies: collect(root.id) }));
}

/** Compress image so Photo button always works under size limits */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let q = 0.72;
        let data = canvas.toDataURL("image/jpeg", q);
        while (data.length > 280_000 && q > 0.35) {
          q -= 0.08;
          data = canvas.toDataURL("image/jpeg", q);
        }
        resolve(data);
      };
      img.onerror = () => reject(new Error("image"));
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function PostBody({
  m,
  onReply,
  onLightbox,
  compact,
}: {
  m: Msg;
  onReply: (m: Msg) => void;
  onLightbox: (src: string) => void;
  compact?: boolean;
}) {
  const isTeacherMsg = m.role === "teacher";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <MessageSquare
              className={cn("h-3 w-3", isTeacherMsg ? "text-indigo-600" : "text-sky-500")}
            />
            {m.author}
          </span>

          {isTeacherMsg ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
              <GraduationCap className="h-3 w-3" /> Teacher
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              <BookOpen className="h-2.5 w-2.5" /> Student
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400">
          {new Date(m.at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {m.text && m.text !== "📷 Photo" && (
        <p
          className={cn(
            "mt-2 leading-relaxed text-slate-800 whitespace-pre-wrap",
            compact ? "text-xs" : "text-sm",
            isTeacherMsg && "font-medium"
          )}
        >
          {m.text}
        </p>
      )}

      {m.imageDataUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLightbox(m.imageDataUrl!);
          }}
          className="group relative mt-3 block max-w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.imageDataUrl}
            alt="shared"
            className={`pointer-events-none w-auto object-contain transition group-hover:opacity-95 ${
              compact ? "max-h-40" : "max-h-64"
            }`}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
            <ZoomIn className="h-3 w-3" /> Enlarge
          </span>
        </button>
      )}

      <div className="mt-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReply(m);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          <Reply className="h-3 w-3 text-slate-500" /> Reply
        </button>
      </div>
    </>
  );
}

function CommonRoomInner() {
  const { user, isSignedIn } = useUser();
  const { userId } = useAuth();
  const sp = useSearchParams();

  // Classroom selection states
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [activeCode, setActiveCode] = useState<string>("");
  const [bootingRooms, setBootingRooms] = useState(true);
  const [activeRoomInfo, setActiveRoomInfo] = useState<ClassroomItem | null>(null);
  const [userRole, setUserRole] = useState<"teacher" | "student">("student");

  // Message states
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const textRef = useRef<HTMLTextAreaElement>(null);

  // 1. Discover user's classrooms (either teacher created or student joined)
  useEffect(() => {
    if (!userId) {
      setBootingRooms(false);
      return;
    }
    const uid = userId;

    const currentRole = getRole(uid);
    setUserRole(currentRole);

    async function loadRooms() {
      setBootingRooms(true);
      try {
        if (currentRole === "teacher") {
          const list = await apiListMyClasses();
          const mapped: ClassroomItem[] = (list || []).map((c) => ({
            code: c.code.toUpperCase(),
            name: c.name || `Class ${c.code}`,
            teacherName: c.teacherName,
          }));
          setClassrooms(mapped);
          if (mapped.length > 0) {
            const queryCode = (sp.get("classCode") || "").toUpperCase();
            const chosen =
              mapped.find((m) => m.code === queryCode) ||
              mapped[0];
            setActiveCode(chosen.code);
            setActiveRoomInfo(chosen);
          }
        } else {
          // Student: read joined classes
          const localCodes = getJoinedClasses(uid);
          let serverClassrooms: ClassroomItem[] = [];

          try {
            const q = new URLSearchParams({ action: "joined" });
            if (localCodes.length) q.set("codes", localCodes.join(","));
            const res = await fetch(`/api/classroom?${q}`, {
              cache: "no-store",
              credentials: "same-origin",
            });
            const data = await res.json().catch(() => ({}));
            if (Array.isArray(data.classrooms)) {
              serverClassrooms = data.classrooms.map((c: Classroom) => ({
                code: c.code.toUpperCase(),
                name: c.name || `Class ${c.code}`,
                teacherName: c.teacherName,
              }));
            }
          } catch {
            // offline fallback
          }

          // Combine with local metadata
          const map = new Map<string, ClassroomItem>();
          for (const c of serverClassrooms) {
            map.set(c.code, c);
          }
          for (const code of localCodes) {
            const upper = code.toUpperCase();
            if (!map.has(upper)) {
              const meta = readJoinedRoomMeta(uid, upper);
              map.set(upper, {
                code: upper,
                name: meta?.name || `Class ${upper}`,
                teacherName: meta?.teacherName,
              });
            }
          }

          const finalRooms = Array.from(map.values());
          setClassrooms(finalRooms);
          if (finalRooms.length > 0) {
            const queryCode = (sp.get("classCode") || "").toUpperCase();
            const chosen =
              finalRooms.find((m) => m.code === queryCode) ||
              finalRooms[0];
            setActiveCode(chosen.code);
            setActiveRoomInfo(chosen);
          }
        }
      } catch (err) {
        console.error("loadRooms", err);
      } finally {
        setBootingRooms(false);
      }
    }

    void loadRooms();
  }, [userId, sp]);

  // Switch active classroom
  const handleSelectRoom = (code: string) => {
    const target = classrooms.find((c) => c.code === code);
    if (!target) return;
    setActiveCode(target.code);
    setActiveRoomInfo(target);
    setMsgs([]);
    seenIds.current.clear();
    setReplyTo(null);
    setText("");
    setImage(null);
  };

  // Merge messages into local cache
  const merge = useCallback(
    (incoming: Msg[], code: string) => {
      if (!code) return;
      const key = localCacheKey(code);
      const map = new Map<string, Msg>();
      try {
        const cached = JSON.parse(localStorage.getItem(key) || "[]") as Msg[];
        for (const m of cached) map.set(m.id, m);
      } catch {
        // ignore
      }
      for (const m of incoming) map.set(m.id, m);
      const list = keepFresh(
        Array.from(map.values()).sort((a, b) => b.at - a.at)
      ).slice(0, 300);

      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        // ignore
      }
      setMsgs(list);

      if (userId) {
        for (const m of incoming) {
          if (seenIds.current.has(m.id)) continue;
          seenIds.current.add(m.id);
          if (m.authorId && m.authorId !== userId) {
            pushNotification(userId, {
              title: m.replyToId
                ? `Reply in ${activeRoomInfo?.name || m.classCode}`
                : `Discussion in ${activeRoomInfo?.name || m.classCode}`,
              body: `${m.author}: ${m.text.slice(0, 80)}`,
              href: `/common-room?classCode=${m.classCode}`,
            });
          }
        }
      }
    },
    [userId, activeRoomInfo]
  );

  // Load messages for current classroom
  const loadClassChats = useCallback(async () => {
    if (!activeCode) return;
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `/api/common-room?classCode=${encodeURIComponent(activeCode)}`
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        merge(data.messages, activeCode);
        if (data.classroom) {
          setActiveRoomInfo((prev) => ({
            code: activeCode,
            name: data.classroom.name || prev?.name || `Class ${activeCode}`,
            teacherName: data.classroom.teacherName || prev?.teacherName,
          }));
        }
      } else if (!res.ok) {
        setError(data.error || "Could not load messages for this class.");
      }
    } catch {
      // offline fallback to cached
      try {
        const cached = JSON.parse(
          localStorage.getItem(localCacheKey(activeCode)) || "[]"
        );
        setMsgs(cached);
      } catch {
        // ignore
      }
    } finally {
      setLoadingMsgs(false);
    }
  }, [activeCode, merge]);

  // Load cached first, then load server & poll
  useEffect(() => {
    if (!activeCode) return;
    try {
      const key = localCacheKey(activeCode);
      const cached = keepFresh(
        JSON.parse(localStorage.getItem(key) || "[]") as Msg[]
      );
      cached.forEach((m) => seenIds.current.add(m.id));
      if (cached.length) setMsgs(cached);
    } catch {
      // ignore
    }

    void loadClassChats();
    const id = setInterval(() => void loadClassChats(), 15_000);
    return () => clearInterval(id);
  }, [activeCode, loadClassChats]);

  // Cooldown countdown
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  // Lightbox modal keyboard handler
  useEffect(() => {
    if (!lightbox) {
      delete document.documentElement.dataset.modalOpen;
      return;
    }
    document.documentElement.dataset.modalOpen = "1";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      delete document.documentElement.dataset.modalOpen;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only images allowed.");
      return;
    }
    setError(null);
    try {
      const data = await compressImage(file);
      setImage(data);
    } catch {
      setError("Could not read photo. Try another image.");
    }
  };

  const startReply = (m: Msg) => {
    setReplyTo(m);
    window.setTimeout(() => {
      textRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      textRef.current?.focus();
    }, 50);
  };

  const post = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSignedIn) {
      setError("Sign in required to post.");
      return;
    }
    if (!activeCode) {
      setError("Please select a classroom first.");
      return;
    }
    if (left > 0) {
      setError(`Wait ${left}s before next post.`);
      return;
    }
    const clean = text.trim();
    if (clean.length < 1 && !image) {
      setError("Write a message or attach a photo.");
      return;
    }
    if (clean.length > MAX_CHARS) {
      setError(`Max ${MAX_CHARS} characters.`);
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/common-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCode: activeCode,
          text: clean,
          imageDataUrl: image || undefined,
          replyToId: replyTo?.id,
          replyToAuthor: replyTo?.author,
          replyToText: replyTo?.text?.slice(0, 80),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post message");
        return;
      }
      if (data.messages) {
        merge(data.messages, activeCode);
      } else if (data.message) {
        merge([data.message, ...msgs], activeCode);
      }
      setText("");
      setImage(null);
      setReplyTo(null);
      setLeft(COOLDOWN_SEC);
      if (userId) {
        pushNotification(userId, {
          title: replyTo ? "Reply posted" : "Posted to Classroom Discussion",
          body: replyTo
            ? `Replied to ${replyTo.author}`
            : "Your message is visible to members of this class.",
          href: `/common-room?classCode=${activeCode}`,
        });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPosting(false);
    }
  };

  // State: Loading classrooms
  if (bootingRooms) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Loading classroom discussion rooms…
        </p>
      </div>
    );
  }

  // State: User has not joined or created any classroom
  if (classrooms.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-sm">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">
          Classroom Discussion Room Locked
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Common Room discussions are strictly private to each classroom batch.
          Chats are visible only to students and teachers who have joined using that specific class code.
        </p>

        {userRole === "teacher" ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">
              You haven&apos;t created any classroom yet.
            </p>
            <Link
              href="/teacher"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Create Classroom in Teacher Hub
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">
              Ask your course teacher for the 6-digit class code to enter your batch discussion.
            </p>
            <Link
              href="/join-class"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
            >
              <Users className="h-4 w-4" /> Join a Classroom Now
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Top Classroom Bar / Switcher */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <Shield className="h-3 w-3" /> Private Batch Room
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                Code: {activeCode}
              </span>
            </div>
            <h1 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
              {activeRoomInfo?.name || `Class ${activeCode}`}
            </h1>
            {activeRoomInfo?.teacherName && (
              <p className="text-xs text-slate-500">
                Instructor: <strong>{activeRoomInfo.teacherName}</strong>
              </p>
            )}
          </div>

          {/* Multiple Classrooms Selector */}
          {classrooms.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Switch:</span>
              <div className="relative">
                <select
                  value={activeCode}
                  onChange={(e) => handleSelectRoom(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 pr-8 outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {classrooms.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* User Identity Note */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            Signed in as:{" "}
            <strong className="text-slate-800">{displayName(user)}</strong>
            <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
              {userRole === "teacher" ? "👨‍🏫 Faculty" : "🎓 Student"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Messages are visible ONLY to members of Class {activeCode}.
          </div>
        </div>
      </div>

      {/* Post Doubt / Question Form */}
      <form onSubmit={(e) => void post(e)} className="mt-5 space-y-3">
        {replyTo && (
          <div className="flex items-start justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs">
            <div>
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Reply className="h-3.5 w-3.5 text-indigo-600" />
                Replying to {replyTo.author}
              </div>
              <div className="mt-0.5 text-indigo-800/80 line-clamp-2">
                {replyTo.text}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-lg p-1 text-indigo-700 hover:bg-indigo-100 transition"
              title="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={3}
            maxLength={MAX_CHARS}
            placeholder={`Ask a doubt or share notes with ${activeRoomInfo?.name || "your classmates"}...`}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pb-8 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
          />
          <span
            className={cn(
              "pointer-events-none absolute bottom-2.5 right-3 text-[11px] font-semibold",
              text.length >= MAX_CHARS ? "text-rose-600 font-bold" : "text-slate-400"
            )}
          >
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        {image && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="attach"
              onClick={() => setLightbox(image)}
              className="h-24 cursor-zoom-in rounded-2xl border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700"
              title="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {left > 0 ? `Wait ${left}s` : "Ready"}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
              <ImagePlus className="h-3.5 w-3.5 text-slate-500" /> Attach Photo
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void onFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={left > 0 || posting || !activeCode}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {replyTo ? "Post Reply" : "Post to Class"}
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
      </form>

      {/* Discussion Message Feed */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            Batch Doubt Wall ({msgs.length})
          </h2>
          {loadingMsgs && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating...
            </span>
          )}
        </div>

        {loadingMsgs && msgs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
            <p className="mt-2">Loading batch conversation…</p>
          </div>
        ) : msgs.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-600">
              No messages in Class {activeCode} yet.
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Be the first to ask a doubt or post a question!
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {buildThreads(msgs).map(({ root, replies }) => {
              const isTeacherRoot = root.role === "teacher";

              return (
                <li
                  key={root.id}
                  className={cn(
                    "rounded-3xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
                    isTeacherRoot
                      ? "border-indigo-200/90 bg-indigo-50/20"
                      : "border-slate-200"
                  )}
                >
                  <PostBody
                    m={root}
                    onReply={startReply}
                    onLightbox={setLightbox}
                  />

                  {replies.length > 0 && (
                    <ul className="mt-3.5 space-y-2 border-l-2 border-indigo-100 pl-3 sm:pl-4">
                      {replies.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5"
                        >
                          {r.replyToAuthor && r.replyToId !== root.id && (
                            <div className="mb-1 text-[10px] font-semibold text-slate-400">
                              <Reply className="mr-1 inline h-2.5 w-2.5" />
                              in reply to {r.replyToAuthor}
                            </div>
                          )}
                          <PostBody
                            m={r}
                            onReply={startReply}
                            onLightbox={setLightbox}
                            compact
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Lightbox photo viewer */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal
          data-modal-open="1"
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="enlarged"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function CommonRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CommonRoomInner />
    </Suspense>
  );
}
