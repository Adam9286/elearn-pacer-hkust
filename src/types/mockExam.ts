export type MockExamMode = "quick_practice" | "exam_simulation";
export type MockExamDifficulty = "easy" | "medium" | "hard";

export interface MockExamRequest {
  mode: MockExamMode;
  topic: string;
  numMultipleChoice: number;
  numOpenEnded: number;
  difficulty: MockExamDifficulty;
  includeTopics: string[];
  excludeTopics: string[];
  sessionId: string;
}

export interface MockExamMcq {
  number: number;
  question: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
  marks?: number;
}

export interface MockExamLongFormSubPart {
  label: string;
  text: string;
  marks: number;
}

export interface MockExamLongForm {
  number: number;
  question: string;
  sub_parts?: MockExamLongFormSubPart[];
  diagram?: string | null;
  model_answer?: string;
  marks?: number;
}

export interface MockExamStructuredPayload {
  mcqs: MockExamMcq[];
  longForm: MockExamLongForm[];
  metadata?: Record<string, unknown>;
}

export interface MockExamPdfArtifacts {
  link: string | null;
  downloadLink: string | null;
  fileId: string | null;
}

export interface MockExamRunnerQuestion {
  id: number;
  number: number;
  type: "mcq";
  question: string;
  topic: string;
  difficulty: MockExamDifficulty;
  options: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  explanation?: string;
  points: number;
}

export interface MockExamNormalizedResponse {
  mode: MockExamMode;
  sessionId: string;
  pdf: MockExamPdfArtifacts;
  structured: MockExamStructuredPayload | null;
  practiceQuestions: MockExamRunnerQuestion[];
  raw: unknown;
}
