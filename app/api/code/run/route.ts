import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LanguageId, TestCase, TestResult } from "@/lib/coding-types";

function runProcess(
  cmd: string,
  args: string[],
  input: string,
  timeoutMs = 4000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    try {
      const child = execFile(
        cmd,
        args,
        { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error && error.killed) {
            resolve({
              stdout: stdout || "",
              stderr: "Time Limit Exceeded (4.0s)",
              exitCode: 124,
            });
            return;
          }
          resolve({
            stdout: stdout || "",
            stderr: stderr || (error ? error.message : ""),
            exitCode: error?.code !== undefined && typeof error.code === "number" ? error.code : 0,
          });
        }
      );

      if (child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    } catch (e) {
      resolve({
        stdout: "",
        stderr: e instanceof Error ? e.message : "Process launch failed",
        exitCode: 1,
      });
    }
  });
}

async function runNative(
  lang: LanguageId,
  code: string,
  input: string
): Promise<{ stdout: string; stderr: string; exitCode: number; timeMs: number }> {
  const tmpDir = os.tmpdir();
  const id = `sl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tStart = Date.now();

  if (lang === "python") {
    const filePath = path.join(tmpDir, `${id}.py`);
    await fs.writeFile(filePath, code, "utf-8");
    try {
      const res = await runProcess("python3", [filePath], input);
      return { ...res, timeMs: Date.now() - tStart };
    } finally {
      await fs.unlink(filePath).catch(() => {});
    }
  }

  if (lang === "c") {
    const srcPath = path.join(tmpDir, `${id}.c`);
    const binPath = path.join(tmpDir, `${id}.out`);
    await fs.writeFile(srcPath, code, "utf-8");
    try {
      const compile = await runProcess(
        "clang",
        ["-O2", srcPath, "-o", binPath, "-lm"],
        "",
        5000
      );
      if (compile.exitCode !== 0) {
        return {
          stdout: "",
          stderr: `Compilation Error:\n${compile.stderr}`,
          exitCode: compile.exitCode,
          timeMs: Date.now() - tStart,
        };
      }
      const res = await runProcess(binPath, [], input);
      return { ...res, timeMs: Date.now() - tStart };
    } finally {
      await fs.unlink(srcPath).catch(() => {});
      await fs.unlink(binPath).catch(() => {});
    }
  }

  if (lang === "cpp") {
    const srcPath = path.join(tmpDir, `${id}.cpp`);
    const binPath = path.join(tmpDir, `${id}.out`);
    await fs.writeFile(srcPath, code, "utf-8");
    try {
      const compile = await runProcess(
        "clang++",
        ["-std=c++17", "-O2", srcPath, "-o", binPath],
        "",
        6000
      );
      if (compile.exitCode !== 0) {
        return {
          stdout: "",
          stderr: `Compilation Error:\n${compile.stderr}`,
          exitCode: compile.exitCode,
          timeMs: Date.now() - tStart,
        };
      }
      const res = await runProcess(binPath, [], input);
      return { ...res, timeMs: Date.now() - tStart };
    } finally {
      await fs.unlink(srcPath).catch(() => {});
      await fs.unlink(binPath).catch(() => {});
    }
  }

  return { stdout: "", stderr: "Unsupported language", exitCode: 1, timeMs: 0 };
}

async function runAiFallback(
  lang: string,
  code: string,
  input: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      stdout: "",
      stderr: "Native compiler unavailable and GEMINI_API_KEY not configured.",
      exitCode: 1,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a high-performance, strictly accurate code execution engine.
Execute this ${lang} program with the given STDIN input.
Output ONLY the raw standard output produced by the program, without markdown, without backticks, without any conversational preamble.
If there is a syntax or compilation error, output "ERROR: <description>".

--- CODE ---
${code}

--- STDIN INPUT ---
${input}
`;
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    if (text.startsWith("ERROR:")) {
      return { stdout: "", stderr: text, exitCode: 1 };
    }
    return { stdout: text, stderr: "", exitCode: 0 };
  } catch (e) {
    return {
      stdout: "",
      stderr: e instanceof Error ? e.message : "Execution failed",
      exitCode: 1,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const lang = (body.language || "python") as LanguageId;
    const code = String(body.code || "");
    const customInput = String(body.input || "");
    const testCases: TestCase[] = Array.isArray(body.testCases)
      ? body.testCases
      : [];

    if (!code.trim()) {
      return NextResponse.json({ ok: false, error: "Code cannot be empty" }, { status: 400 });
    }

    // 1. If running against test cases
    if (testCases.length > 0) {
      const results: TestResult[] = [];
      let allPassed = true;

      for (const tc of testCases) {
        let runRes: { stdout: string; stderr: string; exitCode: number; timeMs?: number };
        try {
          runRes = await runNative(lang, code, tc.input);
        } catch {
          runRes = await runAiFallback(lang, code, tc.input);
        }

        const actualTrim = (runRes.stdout || "").trim();
        const expectedTrim = (tc.expectedOutput || "").trim();
        const passed = runRes.exitCode === 0 && actualTrim === expectedTrim;
        if (!passed) allPassed = false;

        results.push({
          testCaseId: tc.id,
          passed,
          actualOutput: runRes.stdout,
          expectedOutput: tc.expectedOutput,
          error: runRes.stderr || undefined,
          timeMs: runRes.timeMs || 10,
        });
      }

      return NextResponse.json({
        ok: true,
        testResults: results,
        testsPassed: results.filter((r) => r.passed).length,
        testsTotal: results.length,
        allPassed,
      });
    }

    // 2. Custom Input run
    let singleRun: { stdout: string; stderr: string; exitCode: number; timeMs?: number };
    try {
      singleRun = await runNative(lang, code, customInput);
    } catch {
      singleRun = await runAiFallback(lang, code, customInput);
    }

    return NextResponse.json({
      ok: singleRun.exitCode === 0,
      stdout: singleRun.stdout,
      stderr: singleRun.stderr,
      exitCode: singleRun.exitCode,
      timeMs: singleRun.timeMs || 15,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Execution failure";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
