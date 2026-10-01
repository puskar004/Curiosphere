import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problemTitle, problemDescription, language, code, error, action } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: "AI Mentor is not configured (GEMINI_API_KEY missing).",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let systemPrompt = "";
    if (action === "hint") {
      systemPrompt = `You are a friendly, encouraging coding tutor for high school and college students learning programming in ${language}.
The student is solving "${problemTitle}".
Problem Description:
${problemDescription}

Student's current code:
\`\`\`${language}
${code}
\`\`\`

Provide a constructive, gentle HINT.
DO NOT reveal the full solution code.
Explain the algorithmic concept, point out what part of their logic to rethink or double check, and give one concrete nudge forward.
Keep your response concise (3-5 bullet points or short paragraphs).`;
    } else if (action === "explain-error") {
      systemPrompt = `You are a patient programming mentor.
The student got the following error while running their ${language} program:
Error output:
${error}

Student's Code:
\`\`\`${language}
${code}
\`\`\`

Explain:
1. What this error means in plain, simple English.
2. Exactly which line or concept is causing it.
3. How they can fix it themselves conceptually.
Keep it direct and educational.`;
    } else {
      systemPrompt = `You are a code reviewer.
Review this student's ${language} solution for problem "${problemTitle}":
\`\`\`${language}
${code}
\`\`\`
Provide:
1. Time Complexity & Space Complexity analysis.
2. Two tips to make this code cleaner or more efficient.
3. Mention if this pattern matches standard CBSE / interview best practices.`;
    }

    const res = await model.generateContent(systemPrompt);
    const feedback = res.response.text();

    return NextResponse.json({ ok: true, feedback });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI mentor request failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
