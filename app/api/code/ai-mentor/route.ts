import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash",
];

function generatePedagogicalFallback({
  action,
  problemTitle,
  problemDescription,
  language,
  code,
  error,
}: {
  action: string;
  problemTitle?: string;
  problemDescription?: string;
  language?: string;
  code?: string;
  error?: string;
}): string {
  const lang = (language || "cpp").toLowerCase();
  const title = problemTitle || "this challenge";

  if (action === "explain-error") {
    const err = (error || "").toLowerCase();
    let diagnostic = "Here is a breakdown of your program's error:";

    if (err.includes("expected ';'") || err.includes("expected ';' before")) {
      diagnostic = `### 🔍 Compiler Diagnosis: Missing Semicolon \`;\`
1. **What happened**: The ${lang.toUpperCase()} compiler was parsing a statement and hit a new token before the previous statement was terminated.
2. **Where to look**: Check the lines right before where the compiler indicated the error. In ${lang.toUpperCase()}, every statement, variable declaration, and \`return\` must end with a semicolon \`;\`.
3. **Quick Fix**: Add a semicolon at the end of the preceding statement.`;
    } else if (err.includes("undeclared") || err.includes("not declared") || err.includes("nameerror")) {
      diagnostic = `### 🔍 Identifier Error: Undefined Variable or Function
1. **What happened**: Your code referenced a variable or function that hasn't been declared or imported in this scope.
2. **Where to look**: Verify the spelling and capitalization. Remember that ${lang.toUpperCase()} is case-sensitive (\`sum\` is different from \`Sum\`).
3. **Quick Fix**: Ensure the variable is declared before use (e.g. \`int count = 0;\`) or that required headers like \`<iostream>\` / \`<string>\` are included at the top.`;
    } else if (err.includes("indentationerror") || err.includes("taberror")) {
      diagnostic = `### 🔍 Python Indentation Error
1. **What happened**: Python uses indentation (spaces) to define code blocks (loops, if-statements, function bodies).
2. **Where to look**: Check that all lines inside the same block have the exact same number of leading spaces (recommended: 4 spaces per indent level).
3. **Quick Fix**: Avoid mixing tabs and spaces. Re-indent the block with 4 spaces.`;
    } else if (err.includes("indexerror") || err.includes("out of range") || err.includes("segmentation fault") || err.includes("core dumped")) {
      diagnostic = `### 🔍 Memory / Bounds Error: Index Out of Range or Segfault
1. **What happened**: Your program attempted to access an array, vector, or string index that is outside its valid range (e.g., accessing index \`N\` when size is \`N\`, or using a negative index).
2. **Where to look**: Inspect your \`for\` loops and array accessors \`arr[i]\`. Notice that arrays are 0-indexed, so valid indices are \`0\` to \`size - 1\`.
3. **Quick Fix**: Ensure your loop condition uses \`i < size\` instead of \`i <= size\`.`;
    } else if (err.includes("timed out") || err.includes("time limit exceeded")) {
      diagnostic = `### ⏱️ Time Limit Exceeded (TLE) / Infinite Loop
1. **What happened**: Your program took too long to finish. This almost always indicates an infinite loop or an algorithm that is too slow for large inputs.
2. **Where to look**: Check your \`while\` loop termination conditions. Is the loop counter being incremented or decremented properly on every iteration?
3. **Quick Fix**: Ensure the loop variable progresses toward the exit condition in every iteration.`;
    } else {
      diagnostic = `### 🔍 Compilation / Runtime Output Analysis
**Error Message:**
\`\`\`
${error || "Runtime execution halted."}
\`\`\`

**Troubleshooting Checklist:**
1. **Check standard I/O**: Ensure your code reads all input correctly using ${lang === "python" ? "`sys.stdin.read()` or `input()`" : lang === "c" ? "`scanf()`" : "`cin >> ...`"}.
2. **Match output format exactly**: Check for extra spaces, missing newlines, or case differences (e.g. \`True\` vs \`true\`).
3. **Verify edge cases**: Test with empty inputs, negative numbers, or single-element inputs.`;
    }
    return diagnostic;
  }

  if (action === "review") {
    return `### ⚡ AI Code Review & Best Practices for "${title}"

1. **Algorithm Analysis**:
   - Verify whether your solution meets the problem constraints (e.g. \(O(N)\) or \(O(N \\log N)\) for array problems).
   - Watch out for nested loops (\(O(N^2)\)) if \(N > 10^4\), which will exceed typical 1-second limits.

2. **Code Cleanliness & Standards**:
   - Use meaningful variable names (e.g. \`targetSum\`, \`maxFreq\`, \`leftIndex\`) rather than single-letter names.
   - Clean up debug print statements before submitting to the automated grader.
   - In ${lang.toUpperCase()}, ensure memory and streams are cleanly managed.

3. **Competitive / Exam Readiness**:
   - Make sure your output strictly matches the specified format without extra promotional or prompt text.
   - Test your logic manually on the sample input before running against secret test cases!`;
  }

  // Default: hint
  return `### 💡 Mentor Hint for "${title}"

1. **Understand the Goal**:
   - Break the problem into 3 clear phases: **Read Inputs** $\\rightarrow$ **Process / Transform** $\\rightarrow$ **Format Output**.
   
2. **Logic Roadmap**:
   - How can you handle the inputs one-by-one or all at once?
   - Consider what data structures help here (e.g. ${lang === "python" ? "lists, dictionaries, or sets" : lang === "cpp" ? "vectors, unordered_map, or strings" : "arrays and pointers"}).
   
3. **Edge Cases to Watch**:
   - What happens with minimal input (0, 1 element, or negative numbers)?
   - Make sure your final answer matches the required output casing and spacing precisely.

*Try implementing this step by step. If you get stuck on a compiler message, click "Explain My Error"!*`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problemTitle, problemDescription, language, code, error, action } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // If no API key is available, return the structured pedagogical fallback
    if (!apiKey) {
      const fallback = generatePedagogicalFallback({
        action,
        problemTitle,
        problemDescription,
        language,
        code,
        error,
      });
      return NextResponse.json({ ok: true, feedback: fallback });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let systemPrompt = "";
    if (action === "hint") {
      systemPrompt = `You are a friendly, encouraging coding mentor for students learning programming in ${language}.
The student is solving "${problemTitle}".
Problem Description:
${problemDescription}

Student's current code:
\`\`\`${language}
${code}
\`\`\`

Provide a constructive, gentle HINT.
STRICT RULES:
1. DO NOT reveal or write the full solution code.
2. Explain the algorithmic concept, point out what part of their logic to rethink or double check, and give one concrete nudge forward.
3. Keep your response concise (3-4 bullet points or short paragraphs).
4. Format using clean GitHub-flavored markdown.`;
    } else if (action === "explain-error") {
      systemPrompt = `You are a patient programming tutor.
The student encountered the following error while running their ${language} program:
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
Keep it direct, educational, and formatted in clean markdown.`;
    } else {
      systemPrompt = `You are a code reviewer.
Review this student's ${language} solution for problem "${problemTitle}":
\`\`\`${language}
${code}
\`\`\`
Provide:
1. Time Complexity & Space Complexity analysis.
2. Two tips to make this code cleaner or more efficient.
3. Mention if this pattern matches standard CBSE / interview best practices.
Format in clean markdown.`;
    }

    // Try available models in order
    let feedback = "";
    let lastError = "";

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(systemPrompt);
        feedback = res.response.text();
        if (feedback && feedback.trim()) {
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        // Continue to next candidate model
      }
    }

    if (!feedback || !feedback.trim()) {
      // If all models failed or hit rate limits, gracefully provide our pedagogical fallback
      feedback = generatePedagogicalFallback({
        action,
        problemTitle,
        problemDescription,
        language,
        code,
        error: error || lastError,
      });
    }

    return NextResponse.json({ ok: true, feedback });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI mentor request failed";
    // Even on top-level catch, return fallback advice so student is never stuck
    const fallback = generatePedagogicalFallback({
      action: "hint",
      error: msg,
    });
    return NextResponse.json({ ok: true, feedback: fallback });
  }
}
