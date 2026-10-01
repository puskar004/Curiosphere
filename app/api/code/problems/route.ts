import { NextRequest, NextResponse } from "next/server";
import {
  getAllCodingProblems,
  getTeacherProblems,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
} from "@/lib/coding-questions-store";
import type { TrackId, Difficulty, TestCase, LanguageId } from "@/lib/coding-types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = (searchParams.get("track") || "all") as TrackId;
    const scope = searchParams.get("scope") || "all"; // 'all' or 'teacher'

    let problems;
    if (scope === "teacher") {
      problems = await getTeacherProblems(track);
    } else {
      problems = await getAllCodingProblems(track);
    }

    return NextResponse.json({
      ok: true,
      problems,
      total: problems.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load coding problems";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "create";

    if (action === "create") {
      const {
        title,
        track,
        difficulty,
        tags,
        description,
        inputFormat,
        outputFormat,
        constraints,
        sampleInput,
        sampleOutput,
        explanation,
        starterCode,
        testCases,
        authorName,
      } = body;

      if (!title || !description) {
        return NextResponse.json(
          { ok: false, error: "Title and description are required." },
          { status: 400 }
        );
      }

      // Generate sensible default starter templates if not provided
      const defaultStarter: Record<LanguageId, string> = {
        python: `# ${title}\nimport sys\n\ndef solve():\n    input_data = sys.stdin.read().strip()\n    # Write your solution here\n    print(input_data)\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `// ${title}\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    char buffer[1024];\n    // Write your solution here\n    if (fgets(buffer, sizeof(buffer), stdin)) {\n        printf("%s", buffer);\n    }\n    return 0;\n}\n`,
        cpp: `// ${title}\n#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    string s;\n    if (cin >> s) {\n        cout << s << endl;\n    }\n    return 0;\n}\n`,
      };

      const finalStarterCode = {
        python: starterCode?.python?.trim() || defaultStarter.python,
        c: starterCode?.c?.trim() || defaultStarter.c,
        cpp: starterCode?.cpp?.trim() || defaultStarter.cpp,
      };

      // Ensure test cases have unique IDs
      const formattedTestCases: TestCase[] = Array.isArray(testCases) && testCases.length > 0
        ? testCases.map((tc: Partial<TestCase>, idx: number) => ({
            id: tc.id || `tc_${Date.now()}_${idx + 1}`,
            input: String(tc.input ?? ""),
            expectedOutput: String(tc.expectedOutput ?? ""),
            isSecret: Boolean(tc.isSecret),
          }))
        : [
            {
              id: `tc_${Date.now()}_1`,
              input: sampleInput || "",
              expectedOutput: sampleOutput || "",
              isSecret: false,
            },
          ];

      const problem = await createCodingProblem({
        title: String(title).trim(),
        track: (track || "python") as TrackId,
        difficulty: (difficulty || "easy") as Difficulty,
        tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((s) => s.trim()).filter(Boolean) : ["Practice"],
        description: String(description).trim(),
        inputFormat: String(inputFormat || "Standard Input").trim(),
        outputFormat: String(outputFormat || "Standard Output").trim(),
        constraints: String(constraints || "1 <= N <= 10^5").trim(),
        sampleInput: String(sampleInput || "").trim(),
        sampleOutput: String(sampleOutput || "").trim(),
        explanation: explanation ? String(explanation).trim() : undefined,
        starterCode: finalStarterCode,
        testCases: formattedTestCases,
        authorName: authorName ? String(authorName).trim() : "Teacher",
      });

      return NextResponse.json({ ok: true, problem });
    }

    if (action === "update") {
      const { id, updates } = body;
      if (!id) {
        return NextResponse.json({ ok: false, error: "Missing problem ID" }, { status: 400 });
      }

      const updated = await updateCodingProblem(id, updates);
      if (!updated) {
        return NextResponse.json({ ok: false, error: "Problem not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, problem: updated });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ ok: false, error: "Missing problem ID" }, { status: 400 });
      }

      const deleted = await deleteCodingProblem(id);
      return NextResponse.json({ ok: deleted });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
