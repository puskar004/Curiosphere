import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  addClassMessage,
  isUserAuthorizedForClass,
  loadClassMessages,
  type RoomMsg,
} from "@/lib/common-room-server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Sign in required to access discussion" },
        { status: 401 }
      );
    }

    const classCode = req.nextUrl.searchParams.get("classCode") || "";
    if (!classCode.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Class code required. Please select or join a classroom.",
        },
        { status: 400 }
      );
    }

    const authCheck = await isUserAuthorizedForClass(classCode, userId);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Access Denied: You are not enrolled in this classroom.",
        },
        { status: 403 }
      );
    }

    const messages = await loadClassMessages(classCode);
    return NextResponse.json({
      ok: true,
      messages,
      role: authCheck.role,
      classroom: authCheck.classroom
        ? {
            code: authCheck.classroom.code,
            name: authCheck.classroom.name,
            teacherName: authCheck.classroom.teacherName,
          }
        : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load chats";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Sign in required" },
        { status: 401 }
      );
    }

    const user = await currentUser();
    const body = await req.json().catch(() => ({}));
    const classCode = String(body.classCode || "").trim().toUpperCase();

    if (!classCode) {
      return NextResponse.json(
        { ok: false, error: "Class code is required to send message" },
        { status: 400 }
      );
    }

    const authCheck = await isUserAuthorizedForClass(classCode, userId);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Access Denied: You are not enrolled in this classroom.",
        },
        { status: 403 }
      );
    }

    const text = String(body.text || "").trim();
    const imageDataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined;
    const replyToId =
      typeof body.replyToId === "string" ? body.replyToId : undefined;
    const replyToAuthor =
      typeof body.replyToAuthor === "string"
        ? body.replyToAuthor.slice(0, 80)
        : undefined;
    const replyToText =
      typeof body.replyToText === "string"
        ? body.replyToText.slice(0, 120)
        : undefined;

    if (text.length < 1 && !imageDataUrl) {
      return NextResponse.json(
        { ok: false, error: "Write a message or attach a photo." },
        { status: 400 }
      );
    }
    if (text.length > 500) {
      return NextResponse.json(
        { ok: false, error: "Max 500 characters per message." },
        { status: 400 }
      );
    }
    if (imageDataUrl && imageDataUrl.length > 450_000) {
      return NextResponse.json(
        { ok: false, error: "Image too large. Use a smaller photo." },
        { status: 400 }
      );
    }

    const author =
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      (authCheck.role === "teacher" ? "Teacher" : "Student");

    const msg: RoomMsg = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      classCode,
      className: authCheck.classroom?.name,
      author,
      authorId: userId,
      role: authCheck.role,
      text: text || (imageDataUrl ? "📷 Photo" : ""),
      imageDataUrl,
      replyToId,
      replyToAuthor,
      replyToText,
      at: Date.now(),
    };

    const messages = await addClassMessage(classCode, msg);
    return NextResponse.json({ ok: true, message: msg, messages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to post message";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
