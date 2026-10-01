import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash",
];

export interface VivaQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

function getFallbackVivaQuestions(title: string, language: string, code: string): VivaQuestion[] {
  const lang = language.toLowerCase();
  const lowerCode = code.toLowerCase();

  const isMap = lowerCode.includes("map") || lowerCode.includes("dict");
  const isStack = lowerCode.includes("stack") || lowerCode.includes("pop");
  const isPointer = lowerCode.includes("*") || lowerCode.includes("&");

  let q1: VivaQuestion = {
    id: "viva-1",
    question: `What is the primary Time Complexity of your submitted ${language.toUpperCase()} solution for "${title}"?`,
    options: [
      "O(1) Constant Time",
      "O(N) Linear Time proportional to input size",
      "O(N log N) Log-linear Time",
      "O(N^2) Quadratic Time",
    ],
    correctIndex: isMap ? 1 : lowerCode.includes("for") && lowerCode.split("for").length > 2 ? 3 : 1,
    explanation: isMap
      ? "Using a hash table / dictionary allows single-pass O(N) lookup time."
      : "Single loop traversals operate in linear O(N) time complexity.",
  };

  let q2: VivaQuestion = {
    id: "viva-2",
    question: isStack
      ? "Why is a Stack (LIFO) data structure optimal for this problem?"
      : isPointer
      ? "Why are pointers passed to the function instead of primitive values?"
      : `How does your code handle boundary or edge case inputs?`,
    options: isStack
      ? [
          "It guarantees FIFO processing order",
          "It matches the most recently opened symbol with the earliest closing symbol",
          "It sorts elements in ascending order automatically",
          "It uses O(1) auxiliary memory",
        ]
      : isPointer
      ? [
          "To create a copy of the variables in memory",
          "To directly modify the original memory addresses across scopes (call-by-reference)",
          "To speed up integer addition",
          "Because C compilers reject non-pointer arguments",
        ]
      : [
          "By allocating dynamic memory on the heap",
          "By verifying input size and checking base condition bounds",
          "By ignoring standard input streams",
          "By running an infinite loop until valid data arrives",
        ],
    correctIndex: isStack ? 1 : isPointer ? 1 : 1,
    explanation: isStack
      ? "A Stack ensures Last-In-First-Out matching of nested opening and closing characters."
      : isPointer
      ? "Passing pointers transmits variable memory addresses so alterations persist outside the function."
      : "Checking base condition bounds prevents runtime segmentation faults or out-of-bounds errors.",
  };

  return [q1, q2];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problemTitle, language, code } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      const fallbackQuestions = getFallbackVivaQuestions(
        problemTitle || "Coding Task",
        language || "cpp",
        code || ""
      );
      return NextResponse.json({ ok: true, questions: fallbackQuestions });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are a strict, experienced Computer Science University Examiner conducting an Oral Code Viva for a college lab practical.
The student has just written and passed all test cases for the problem: "${problemTitle}" in ${language}.

Here is the student's actual source code:
\`\`\`${language}
${code}
\`\`\`

Generate exactly 2 targeted Viva MCQs based directly on their actual implementation.
One question MUST test the time/space complexity or line-specific reasoning of their logic (e.g. why they picked a specific data structure or loop condition).
The second question MUST test edge-case vulnerability or how their code handles unexpected inputs.

Return ONLY a valid JSON array of 2 objects with this exact structure, with no markdown code fences, no extra text:
[
  {
    "id": "viva-1",
    "question": "Clear, precise question about their code...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Brief 1-line justification of why Option B is correct"
  },
  {
    "id": "viva-2",
    "question": "Another precise question about memory/data structures/edge cases...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief 1-line justification of why Option A is correct"
  }
]`;

    let generatedJson = "";
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(prompt);
        const text = res.response.text().trim();
        // Clean out any accidental markdown code fences
        const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
          generatedJson = cleaned;
          break;
        }
      } catch {
        // try next candidate model
      }
    }

    if (generatedJson) {
      try {
        const questions: VivaQuestion[] = JSON.parse(generatedJson);
        if (Array.isArray(questions) && questions.length >= 2) {
          return NextResponse.json({ ok: true, questions: questions.slice(0, 2) });
        }
      } catch {
        // parsing failed, use fallback
      }
    }

    // Fallback if AI generation failed
    const fallbackQuestions = getFallbackVivaQuestions(
      problemTitle || "Coding Task",
      language || "cpp",
      code || ""
    );
    return NextResponse.json({ ok: true, questions: fallbackQuestions });
  } catch (err: unknown) {
    const fallbackQuestions = getFallbackVivaQuestions("Coding Task", "cpp", "");
    return NextResponse.json({ ok: true, questions: fallbackQuestions });
  }
}
