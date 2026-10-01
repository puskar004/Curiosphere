export type LanguageId = "python" | "c" | "cpp";
export type TrackId = "all" | "python" | "c" | "cpp" | "dsa";
export type Difficulty = "easy" | "medium" | "hard";

export type TestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  isSecret?: boolean;
};

export type CodingProblem = {
  id: string;
  title: string;
  track: TrackId;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  explanation?: string;
  starterCode: Record<LanguageId, string>;
  testCases: TestCase[];
  source?: "teacher" | "system";
  authorName?: string;
  createdAt?: number;
};

export type TestResult = {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error?: string;
  timeMs?: number;
};

export type ExecutionResult = {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number;
  timeMs?: number;
  testResults?: TestResult[];
  testsPassed?: number;
  testsTotal?: number;
};
