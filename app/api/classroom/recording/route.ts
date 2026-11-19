import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  addMaterialToClass,
  findClassroomByCode,
} from "@/lib/classroom-server";
import {
  buildRecordingKey,
  createR2PresignedPutUrl,
  isR2Configured,
} from "@/lib/r2-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    configured: isR2Configured(),
    provider: "cloudflare-r2",
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      classCode?: string;
      title?: string;
      subject?: string;
      contentType?: string;
      publicUrl?: string;
      durationSec?: number;
    };

    const action = String(body.action || "").trim();
    const classCode = String(body.classCode || "").trim().toUpperCase();

    if (!classCode) {
      return NextResponse.json(
        { ok: false, error: "classCode is required" },
        { status: 400 }
      );
    }

    // Verify caller owns this classroom
    const found = await findClassroomByCode(classCode);
    if (!found || found.classroom.teacherId !== userId) {
      return NextResponse.json(
        { ok: false, error: "Only the classroom teacher can upload live recordings." },
        { status: 403 }
      );
    }

    if (action === "presign") {
      if (!isR2Configured()) {
        return NextResponse.json(
          {
            ok: false,
            configured: false,
            error:
              "Cloudflare R2 credentials are not set in environment variables yet (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL).",
          },
          { status: 503 }
        );
      }

      const contentType = String(body.contentType || "video/webm").toLowerCase();
      const ext = contentType.includes("mp4") ? "mp4" : "webm";
      const key = buildRecordingKey({
        classCode,
        title: body.title || "live-class",
        ext,
      });

      const signed = createR2PresignedPutUrl({
        key,
        expiresInSeconds: 3600,
      });

      return NextResponse.json({
        ok: true,
        configured: true,
        uploadUrl: signed.uploadUrl,
        publicUrl: signed.publicUrl,
        key: signed.key,
        contentType,
      });
    }

    if (action === "publish") {
      const publicUrl = String(body.publicUrl || "").trim();
      if (!publicUrl || !/^https?:\/\//i.test(publicUrl)) {
        return NextResponse.json(
          { ok: false, error: "Valid recording publicUrl is required" },
          { status: 400 }
        );
      }

      const user = await currentUser();
      const teacherName =
        user?.fullName ||
        user?.firstName ||
        found.classroom.teacherName ||
        "Teacher";

      const mins = body.durationSec ? Math.max(1, Math.round(body.durationSec / 60)) : null;
      const baseTitle = String(body.title || "Live Class Recording")
        .replace(/^Teacher\s*·\s*/i, "")
        .trim();
      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      const finalTitle = `${baseTitle} (Recorded · ${dateStr}${mins ? ` · ${mins}m` : ""})`;

      const classroom = await addMaterialToClass(userId, classCode, {
        title: finalTitle,
        subject: String(body.subject || "Live Recording").trim() || "Live Recording",
        type: "video",
        url: publicUrl,
        teacherName,
      });

      const publishedMaterial =
        classroom.materials?.find((m) => m.url === publicUrl) ||
        classroom.materials?.[0] || {
          title: finalTitle,
          url: publicUrl,
          type: "video",
        };

      return NextResponse.json({
        ok: true,
        material: publishedMaterial,
        classroom,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action. Use 'presign' or 'publish'." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recording API error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
