export type MockExamMode = "quick_practice" | "exam_simulation";
export type MockExamDifficulty = "easy" | "medium" | "hard";
export type MockExamLibraryScope = "personal" | "shared";
export type MockExamSessionStatus =
  | "generating"
  | "ready"
  | "in_progress"
  | "submitted"
  | "graded"
  | "abandoned"
  | "failed";

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
  images?: MockExamImageAsset[];
}

export interface MockExamLongFormSubPart {
  label: string;
  text: string;
  marks: number;
}

export interface MockExamImageAsset {
  url: string;
  alt?: string;
  caption?: string;
  widthPercent?: number;
}

export interface MockExamLongForm {
  number: number;
  question: string;
  sub_parts?: MockExamLongFormSubPart[];
  diagram?: string | null;
  model_answer?: string;
  marks?: number;
  images?: MockExamImageAsset[];
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

export interface MockExamAnswerRecord {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
  selectedOptionIndex?: number | null;
  submittedAt?: string | null;
}

export interface MockExamHistorySummary {
  sessionId: string;
  topic: string;
  difficulty: MockExamDifficulty;
  createdAt: string;
  submittedAt: string | null;
  totalQuestions: number;
  totalPoints: number;
  scoredPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  selectedTopics: string[];
}

export interface MockExamReviewRecord {
  sessionId: string;
  topic: string;
  difficulty: MockExamDifficulty;
  createdAt: string;
  submittedAt: string | null;
  selectedTopics: string[];
  questions: MockExamRunnerQuestion[];
  answers: MockExamAnswerRecord[];
  totalPoints: number;
  scoredPoints: number;
}

export interface MockExamNormalizedResponse {
  mode: MockExamMode;
  sessionId: string;
  pdf: MockExamPdfArtifacts;
  structured: MockExamStructuredPayload | null;
  practiceQuestions: MockExamRunnerQuestion[];
  warnings: string[];
  requiresReview: boolean;
  success: boolean;
  raw: unknown;
}

export interface MockExamRequestedCounts {
  mcq: number;
  openEnded: number;
}

export interface MockExamLibrarySummary {
  sessionId: string;
  mode: MockExamMode;
  status: MockExamSessionStatus;
  topic: string;
  difficulty: MockExamDifficulty;
  createdAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  selectedTopics: string[];
  requestedCounts: MockExamRequestedCounts;
  totalQuestions: number;
  totalPoints: number;
  scoredPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  pdf: MockExamPdfArtifacts;
  warningCount: number;
  requiresReview: boolean;
  isSharedToPool?: boolean;
  sharedExamId?: string | null;
}

export interface MockExamSavedSession {
  sessionId: string;
  mode: MockExamMode;
  status: MockExamSessionStatus;
  topic: string;
  difficulty: MockExamDifficulty;
  createdAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  selectedTopics: string[];
  requestedCounts: MockExamRequestedCounts;
  totalQuestions: number;
  totalPoints: number;
  scoredPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  normalizedResponse: MockExamNormalizedResponse;
}

export interface MockExamSharedExamSummary {
  sharedExamId: string;
  sourceSessionId: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string;
  mode: MockExamMode;
  topic: string;
  difficulty: MockExamDifficulty;
  createdAt: string;
  selectedTopics: string[];
  requestedCounts: MockExamRequestedCounts;
  totalQuestions: number;
  totalPoints: number;
  pdf: MockExamPdfArtifacts;
  warningCount: number;
  requiresReview: boolean;
  usageCount: number;
}
