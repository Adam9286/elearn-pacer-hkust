import { externalSupabase } from "@/lib/externalSupabase";
import type {
  MockExamAnswerRecord,
  MockExamDifficulty,
  MockExamHistorySummary,
  MockExamLibraryScope,
  MockExamLibrarySummary,
  MockExamLongForm,
  MockExamMode,
  MockExamNormalizedResponse,
  MockExamPdfArtifacts,
  MockExamRequest,
  MockExamReviewRecord,
  MockExamRunnerQuestion,
  MockExamSavedSession,
  MockExamSessionStatus,
  MockExamSharedExamSummary,
  MockExamStructuredPayload,
} from "@/types/mockExam";
import {
  extractMockExamRequiresReview,
  extractMockExamSuccess,
  extractMockExamWarnings,
} from "@/utils/mockExamResponse";

type PersistenceStatus = "saved" | "skipped" | "failed";

export interface MockExamPersistenceResult {
  status: PersistenceStatus;
  sessionId: string | null;
  reason?: string;
}

interface QuickPracticeCompletionInput {
  sessionId: string;
  questions: MockExamRunnerQuestion[];
  answers: MockExamAnswerRecord[];
  totalPoints: number;
  scoredPoints: number;
  elapsedSeconds?: number;
}

export interface MockExamShareResult extends MockExamPersistenceResult {
  sharedExamId?: string | null;
}

export interface MockExamUseSharedResult extends MockExamPersistenceResult {
  normalizedResponse?: MockExamNormalizedResponse;
  mode?: MockExamMode;
  topic?: string;
  difficulty?: MockExamDifficulty;
  selectedTopics?: string[];
}

const SHARED_POOL_TABLE = "shared_mock_exams";

const normalizeSelectedTopics = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((topic): topic is string => typeof topic === "string") : [];

const isMissingRelationError = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes(`relation "${SHARED_POOL_TABLE}" does not exist`) ||
        error.message?.includes(`relation "public.${SHARED_POOL_TABLE}" does not exist`) ||
        error.message?.includes(`Could not find the table '${SHARED_POOL_TABLE}'`) ||
        error.message?.includes(`Could not find the table 'public.${SHARED_POOL_TABLE}'`) ||
        (error.message?.includes("schema cache") &&
          error.message?.includes(SHARED_POOL_TABLE))),
  );

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const SESSION_STATUSES: MockExamSessionStatus[] = [
  "generating",
  "ready",
  "in_progress",
  "submitted",
  "graded",
  "abandoned",
  "failed",
];

const normalizeMode = (value: unknown): MockExamMode =>
  value === "quick_practice" ? "quick_practice" : "exam_simulation";

const normalizeDifficulty = (value: unknown): MockExamDifficulty =>
  value === "easy" || value === "medium" || value === "hard" ? value : "medium";

const normalizeSessionStatus = (value: unknown): MockExamSessionStatus =>
  SESSION_STATUSES.includes(value as MockExamSessionStatus)
    ? (value as MockExamSessionStatus)
    : "ready";

const sumMarks = (structured: MockExamStructuredPayload | null) => {
  if (!structured) {
    return 0;
  }

  const mcqMarks = structured.mcqs.reduce((sum, question) => sum + (question.marks ?? 2), 0);
  const longFormMarks = structured.longForm.reduce((sum, question) => sum + (question.marks ?? 0), 0);

  return mcqMarks + longFormMarks;
};

const getTotalQuestions = (
  request: MockExamRequest,
  structured: MockExamStructuredPayload | null,
) => {
  if (!structured) {
    return request.numMultipleChoice + request.numOpenEnded;
  }

  return structured.mcqs.length + structured.longForm.length;
};

const getBlueprintCategory = (
  questionNumber: number,
  structured: MockExamStructuredPayload | null,
) => {
  const metadata = structured?.metadata as Record<string, any> | undefined;
  const variation = metadata?.variation as Record<string, any> | undefined;
  const blueprint = Array.isArray(variation?.blueprint) ? variation.blueprint : [];

  return blueprint.find((item: any) => item?.questionNumber === questionNumber)?.category;
};

const inferLongFormQuestionType = (
  question: MockExamLongForm,
  structured: MockExamStructuredPayload | null,
) => {
  const category = getBlueprintCategory(question.number, structured);

  if (typeof category === "string" && category.toLowerCase().includes("calculation")) {
    return "calculation";
  }

  if (question.diagram) {
    return "diagram_based";
  }

  return "open_ended";
};

const buildProgressState = (mode: MockExamMode, structured: MockExamStructuredPayload | null) => ({
  currentQuestionIndex: 0,
  answers: {},
  flaggedQuestionIds: [],
  startedInApp: mode === "quick_practice" && !!structured,
});

const letterToIndex = (answer?: string) => {
  if (!answer) {
    return undefined;
  }

  const normalized = answer.trim().toUpperCase();
  const index = normalized.charCodeAt(0) - 65;

  return index >= 0 ? index : undefined;
};

const toRunnerQuestionFromRow = (row: Record<string, any>): MockExamRunnerQuestion => {
  const snapshot = isRecord(row.question_snapshot) ? row.question_snapshot : {};
  const answerKey = isRecord(row.answer_key_snapshot) ? row.answer_key_snapshot : {};
  const correctAnswerText =
    typeof answerKey.correct_answer === "string" ? answerKey.correct_answer : undefined;

  return {
    id: Number(row.question_number),
    number: Number(row.question_number),
    type: "mcq",
    question: typeof snapshot.question === "string" ? snapshot.question : "",
    topic: typeof row.topic === "string" && row.topic.trim() ? row.topic : "Computer Networks",
    difficulty: "medium",
    options: Array.isArray(snapshot.options)
      ? snapshot.options.filter((value): value is string => typeof value === "string")
      : [],
    correctAnswer: letterToIndex(correctAnswerText),
    correctAnswerText,
    explanation:
      typeof answerKey.explanation === "string" ? answerKey.explanation : undefined,
    points: Number(snapshot.marks ?? row.marks ?? 0) || 0,
  };
};

const buildResultSummary = (
  answers: MockExamAnswerRecord[],
  scoredPoints: number,
  totalPoints: number,
) => {
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const incorrectCount = answers.length - correctCount;
  const percentage = totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0;

  return {
    correctCount,
    incorrectCount,
    scoredPoints,
    totalPoints,
    percentage,
    completedQuestionCount: answers.length,
  };
};

const getRequestedCounts = (
  config: unknown,
  totalQuestions: number,
  mode: MockExamMode,
) => {
  const requestedCounts = isRecord(config) && isRecord(config.requestedCounts)
    ? config.requestedCounts
    : {};

  const mcq = Number(requestedCounts.mcq ?? (mode === "quick_practice" ? totalQuestions : 0)) || 0;
  const openEnded = Number(requestedCounts.openEnded ?? (mode === "exam_simulation" ? 0 : 0)) || 0;

  return {
    mcq: Math.max(0, Math.round(mcq)),
    openEnded: Math.max(0, Math.round(openEnded)),
  };
};

const normalizePdfArtifacts = (sessionRow: Record<string, any>): MockExamPdfArtifacts => {
  const examPayload = isRecord(sessionRow.exam_payload) ? sessionRow.exam_payload : {};
  const payloadPdf = isRecord(examPayload.pdf) ? examPayload.pdf : {};
  const directLink =
    typeof sessionRow.pdf_drive_link === "string" && sessionRow.pdf_drive_link.trim()
      ? sessionRow.pdf_drive_link.trim()
      : null;
  const directDownloadLink =
    typeof sessionRow.pdf_download_link === "string" && sessionRow.pdf_download_link.trim()
      ? sessionRow.pdf_download_link.trim()
      : null;
  const payloadLink =
    typeof payloadPdf.link === "string" && payloadPdf.link.trim() ? payloadPdf.link.trim() : null;
  const payloadDownloadLink =
    typeof payloadPdf.downloadLink === "string" && payloadPdf.downloadLink.trim()
      ? payloadPdf.downloadLink.trim()
      : null;
  const payloadFileId =
    typeof payloadPdf.fileId === "string" && payloadPdf.fileId.trim()
      ? payloadPdf.fileId.trim()
      : null;

  const link = directLink ?? payloadLink;
  const downloadLink = directDownloadLink ?? payloadDownloadLink;
  let fileId = payloadFileId;

  if (!fileId && link) {
    const match = link.match(/\/d\/([^/]+)/);
    if (match) {
      fileId = match[1];
    }
  }

  return {
    link,
    downloadLink,
    fileId,
  };
};

const getExamPayloadRecord = (sessionRow: Record<string, any>) =>
  isRecord(sessionRow.exam_payload) ? sessionRow.exam_payload : {};

const getStoredRawResponse = (
  sessionRow: Record<string, any>,
  fallback: Record<string, any>,
) => {
  const examPayload = getExamPayloadRecord(sessionRow);
  if (examPayload.raw !== undefined) {
    return examPayload.raw;
  }

  return Object.keys(examPayload).length > 0 ? examPayload : fallback;
};

const getStoredWorkflowWarnings = (sessionRow: Record<string, any>) => {
  const examPayload = getExamPayloadRecord(sessionRow);
  return extractMockExamWarnings(examPayload.raw ?? examPayload);
};

const getStoredRequiresReview = (sessionRow: Record<string, any>) => {
  const examPayload = getExamPayloadRecord(sessionRow);
  return extractMockExamRequiresReview(examPayload.raw ?? examPayload);
};

const getStoredSuccess = (sessionRow: Record<string, any>) => {
  const examPayload = getExamPayloadRecord(sessionRow);
  return extractMockExamSuccess(examPayload.raw ?? examPayload);
};

const buildSharedExamPayload = (
  sessionRow: Record<string, any>,
  questionRows: Record<string, any>[],
) => {
  const structured = getStructuredPayloadFromSession(sessionRow, questionRows);
  const pdf = normalizePdfArtifacts(sessionRow);
  const examPayload = getExamPayloadRecord(sessionRow);

  return {
    structuredExam: structured,
    pdf,
    raw: examPayload.raw ?? null,
    success: getStoredSuccess(sessionRow),
    requiresReview: getStoredRequiresReview(sessionRow),
    warnings: getStoredWorkflowWarnings(sessionRow),
  };
};

const buildRequestFromCatalogRow = (
  row: Record<string, any>,
  mode: MockExamMode,
  requestedCounts: { mcq: number; openEnded: number },
): MockExamRequest => {
  const totalQuestions = Number(row.total_questions ?? 0) || 0;
  const topic = typeof row.topic === "string" && row.topic.trim() ? row.topic : "Computer Networks";
  const includeTopics = normalizeSelectedTopics(row.selected_topics);

  return {
    mode,
    topic,
    numMultipleChoice:
      requestedCounts.mcq > 0
        ? requestedCounts.mcq
        : mode === "quick_practice"
          ? Math.max(totalQuestions, 5)
          : 10,
    numOpenEnded: mode === "quick_practice" ? 0 : Math.max(requestedCounts.openEnded, 0),
    difficulty: normalizeDifficulty(row.difficulty),
    includeTopics,
    excludeTopics: [],
    sessionId: `shared-${Date.now()}`,
  };
};

const buildNormalizedResponseFromCatalogRow = (
  row: Record<string, any>,
  sharedExamId: string,
) => {
  const mode = normalizeMode(row.mode);
  const difficulty = normalizeDifficulty(row.difficulty);
  const topic = typeof row.topic === "string" && row.topic.trim() ? row.topic : "Computer Networks";
  const examPayload = isRecord(row.exam_payload) ? row.exam_payload : {};
  const structured = isRecord(examPayload.structuredExam)
    ? (examPayload.structuredExam as MockExamStructuredPayload)
    : null;
  const raw =
    examPayload.raw ??
    (Object.keys(examPayload).length > 0
      ? examPayload
      : {
          source: "shared_mock_exam_pool",
          sharedExamId,
        });
  const warnings = extractMockExamWarnings(raw);
  const requiresReview = extractMockExamRequiresReview(raw);
  const success = extractMockExamSuccess(raw);

  return {
    mode,
    difficulty,
    topic,
    selectedTopics: normalizeSelectedTopics(row.selected_topics),
    requestedCounts: getRequestedCounts(row.config, Number(row.total_questions ?? 0) || 0, mode),
    normalizedResponse: {
      mode,
      sessionId: `shared-${sharedExamId}-${Date.now()}`,
      pdf: normalizePdfArtifacts(row),
      structured,
      practiceQuestions: toPracticeQuestions(structured, difficulty, topic),
      warnings,
      requiresReview,
      success,
      raw,
    } satisfies MockExamNormalizedResponse,
  };
};

const loadOwnedSharedExamMap = async (userId: string, sessionIds: string[]) => {
  if (sessionIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await externalSupabase
    .from(SHARED_POOL_TABLE)
    .select("id, source_session_id")
    .eq("owner_user_id", userId)
    .in("source_session_id", sessionIds);

  if (error) {
    if (isMissingRelationError(error)) {
      return new Map<string, string>();
    }

    console.error("[MockExam] Failed to load owned shared pool rows:", error);
    return new Map<string, string>();
  }

  const sharedExamIdBySourceSessionId = new Map<string, string>();

  for (const row of data ?? []) {
    if (typeof row.source_session_id === "string" && typeof row.id === "string") {
      sharedExamIdBySourceSessionId.set(row.source_session_id, row.id);
    }
  }

  return sharedExamIdBySourceSessionId;
};

const toPracticeQuestions = (
  structured: MockExamStructuredPayload | null,
  difficulty: MockExamDifficulty,
  topicLabel: string,
): MockExamRunnerQuestion[] => {
  if (!structured) {
    return [];
  }

  return structured.mcqs.map((question) => ({
    id: question.number,
    number: question.number,
    type: "mcq",
    question: question.question,
    topic: topicLabel,
    difficulty,
    options: Array.isArray(question.options)
      ? question.options.filter((value): value is string => typeof value === "string")
      : [],
    correctAnswer: letterToIndex(question.correct_answer),
    correctAnswerText: question.correct_answer,
    explanation: question.explanation,
    points: question.marks ?? 2,
  }));
};

const toStructuredPayloadFromQuestionRows = (
  rows: Record<string, any>[],
): MockExamStructuredPayload | null => {
  if (rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftOrder = Number(left.display_order ?? left.question_number ?? 0) || 0;
    const rightOrder = Number(right.display_order ?? right.question_number ?? 0) || 0;
    return leftOrder - rightOrder;
  });

  const mcqs: MockExamStructuredPayload["mcqs"] = [];
  const longForm: MockExamStructuredPayload["longForm"] = [];

  for (const row of sortedRows) {
    const snapshot = isRecord(row.question_snapshot) ? row.question_snapshot : {};
    const answerKey = isRecord(row.answer_key_snapshot) ? row.answer_key_snapshot : {};
    const questionNumber = Number(row.question_number ?? snapshot.number ?? 0) || 0;

    if (row.question_type === "mcq") {
      mcqs.push({
        number: questionNumber,
        question: typeof snapshot.question === "string" ? snapshot.question : "",
        options: Array.isArray(snapshot.options)
          ? snapshot.options.filter((value): value is string => typeof value === "string")
          : [],
        correct_answer:
          typeof answerKey.correct_answer === "string" ? answerKey.correct_answer : undefined,
        explanation:
          typeof answerKey.explanation === "string" ? answerKey.explanation : undefined,
        marks: Number(snapshot.marks ?? row.marks ?? 0) || 0,
      });
      continue;
    }

      longForm.push({
        number: questionNumber,
        question: typeof snapshot.question === "string" ? snapshot.question : "",
        sub_parts: Array.isArray(snapshot.sub_parts)
          ? snapshot.sub_parts.filter(
              (
                value,
              ): value is {
                label: string;
                text: string;
                marks: number;
              } =>
                isRecord(value) &&
                typeof value.label === "string" &&
                typeof value.text === "string" &&
                typeof value.marks === "number",
            )
          : [],
        diagram:
          typeof snapshot.diagram === "string" || snapshot.diagram === null
            ? snapshot.diagram
          : undefined,
      model_answer:
        typeof answerKey.model_answer === "string" ? answerKey.model_answer : undefined,
      marks: Number(snapshot.marks ?? row.marks ?? 0) || 0,
    });
  }

  return {
    mcqs,
    longForm,
  };
};

const getStructuredPayloadFromSession = (
  sessionRow: Record<string, any>,
  questionRows: Record<string, any>[],
) => {
  const examPayload = isRecord(sessionRow.exam_payload) ? sessionRow.exam_payload : {};
  const structuredFromPayload = isRecord(examPayload.structuredExam)
    ? (examPayload.structuredExam as MockExamStructuredPayload)
    : null;

  return structuredFromPayload ?? toStructuredPayloadFromQuestionRows(questionRows);
};

const getSummaryScores = (row: Record<string, any>) => {
  const resultSummary = isRecord(row.result_summary) ? row.result_summary : {};
  const scoredPoints = Number(resultSummary.scoredPoints ?? 0) || 0;
  const totalPoints = Number(resultSummary.totalPoints ?? row.total_marks ?? 0) || 0;
  const percentage =
    Number(resultSummary.percentage ?? (totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0)) || 0;
  const correctCount = Number(resultSummary.correctCount ?? 0) || 0;
  const incorrectCount = Number(resultSummary.incorrectCount ?? 0) || 0;

  return {
    scoredPoints,
    totalPoints,
    percentage,
    correctCount,
    incorrectCount,
  };
};

const buildQuestionRows = (
  sessionId: string,
  response: MockExamNormalizedResponse,
  request: MockExamRequest,
) => {
  const structured = response.structured;

  if (!structured) {
    return [];
  }

  const topicFallback = request.includeTopics.length > 0
    ? request.includeTopics.join(", ")
    : request.topic;

  const mcqRows = structured.mcqs.map((question, index) => ({
    session_id: sessionId,
    question_number: question.number,
    display_order: index + 1,
    question_type: "mcq",
    topic: topicFallback,
    subtopic: null,
    marks: question.marks ?? 2,
    source_lineage: {
      source: "n8n_mock_exam_generator",
      mode: request.mode,
      kind: "mcq",
    },
    question_snapshot: {
      number: question.number,
      question: question.question,
      options: question.options ?? [],
      marks: question.marks ?? 2,
    },
    answer_key_snapshot: {
      correct_answer: question.correct_answer ?? null,
      explanation: question.explanation ?? null,
    },
  }));

  const longFormRows = structured.longForm.map((question, index) => ({
    session_id: sessionId,
    question_number: question.number,
    display_order: structured.mcqs.length + index + 1,
    question_type: inferLongFormQuestionType(question, structured),
    topic: topicFallback,
    subtopic: getBlueprintCategory(question.number, structured) ?? null,
    marks: question.marks ?? 0,
    source_lineage: {
      source: "n8n_mock_exam_generator",
      mode: request.mode,
      kind: "long_form",
      blueprintCategory: getBlueprintCategory(question.number, structured) ?? null,
    },
    question_snapshot: {
      number: question.number,
      question: question.question,
      sub_parts: question.sub_parts ?? [],
      diagram: question.diagram ?? null,
      marks: question.marks ?? 0,
    },
    answer_key_snapshot: {
      model_answer: question.model_answer ?? null,
    },
  }));

  return [...mcqRows, ...longFormRows];
};

export const persistMockExamSession = async (
  request: MockExamRequest,
  response: MockExamNormalizedResponse,
): Promise<MockExamPersistenceResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for persistence:", userError);
    return {
      status: "failed",
      sessionId: null,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId: null,
      reason: "No authenticated user session. Skipped saving exam history.",
    };
  }

  const structured = response.structured;
  const totalQuestions = getTotalQuestions(request, structured);
  const totalMarks = sumMarks(structured);

  const sessionInsert = {
    user_id: user.id,
    mode: request.mode,
    status: "ready",
    topic: request.topic,
    difficulty: request.difficulty,
    selected_topics: request.includeTopics,
    config: {
      requestedCounts: {
        mcq: request.numMultipleChoice,
        openEnded: request.numOpenEnded,
      },
      excludeTopics: request.excludeTopics,
      n8nSessionId: response.sessionId,
    },
    progress_state: buildProgressState(request.mode, structured),
    source_summary: structured?.metadata ?? [],
    exam_payload: {
      structuredExam: structured,
      pdf: response.pdf,
      success: response.success,
      requiresReview: response.requiresReview,
      warnings: response.warnings,
      raw: response.raw,
    },
    result_summary: {},
    pdf_drive_link: response.pdf.link,
    pdf_download_link: response.pdf.downloadLink,
    total_questions: totalQuestions,
    total_marks: totalMarks,
    started_at: request.mode === "quick_practice" && structured ? new Date().toISOString() : null,
  };

  const { data: insertedSession, error: sessionError } = await externalSupabase
    .from("mock_exam_sessions")
    .insert(sessionInsert)
    .select("id")
    .single();

  if (sessionError) {
    console.error("[MockExam] Failed to persist exam session:", sessionError);
    return {
      status: "failed",
      sessionId: null,
      reason: sessionError.message,
    };
  }

  const savedSessionId = insertedSession?.id ?? null;

  if (!savedSessionId) {
    return {
      status: "failed",
      sessionId: null,
      reason: "Session insert succeeded without returning an id.",
    };
  }

  const questionRows = buildQuestionRows(savedSessionId, response, request);

  if (questionRows.length > 0) {
    const { error: questionError } = await externalSupabase
      .from("mock_exam_questions")
      .insert(questionRows);

    if (questionError) {
      console.error("[MockExam] Failed to persist exam questions:", questionError);

      await externalSupabase
        .from("mock_exam_sessions")
        .update({
          status: "failed",
          result_summary: {
            persistenceError: questionError.message,
          },
        })
        .eq("id", savedSessionId);

      return {
        status: "failed",
        sessionId: savedSessionId,
        reason: questionError.message,
      };
    }
  }

  return {
    status: "saved",
    sessionId: savedSessionId,
  };
};

export const listSavedMockExams = async (
  limit = 24,
): Promise<MockExamLibrarySummary[]> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await externalSupabase
    .from("mock_exam_sessions")
    .select(
      "id, mode, status, topic, difficulty, selected_topics, config, result_summary, exam_payload, pdf_drive_link, pdf_download_link, total_questions, total_marks, created_at, started_at, submitted_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[MockExam] Failed to load saved mock exams:", error);
    return [];
  }

  const rows = data ?? [];
  const sharedExamIdBySourceSessionId = await loadOwnedSharedExamMap(
    user.id,
    rows
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((sessionId): sessionId is string => Boolean(sessionId)),
  );

  return rows.map((row) => {
    const mode = normalizeMode(row.mode);
    const scores = getSummaryScores(row);
    const sharedExamId = typeof row.id === "string" ? sharedExamIdBySourceSessionId.get(row.id) ?? null : null;
    const warningCount = getStoredWorkflowWarnings(row).length;
    const requiresReview = getStoredRequiresReview(row);

    return {
      sessionId: row.id,
      mode,
      status: normalizeSessionStatus(row.status),
      topic: typeof row.topic === "string" ? row.topic : "Computer Networks",
      difficulty: normalizeDifficulty(row.difficulty),
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      startedAt: typeof row.started_at === "string" ? row.started_at : null,
      submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      selectedTopics: Array.isArray(row.selected_topics)
        ? row.selected_topics.filter((topic): topic is string => typeof topic === "string")
        : [],
      requestedCounts: getRequestedCounts(row.config, Number(row.total_questions ?? 0) || 0, mode),
      totalQuestions: Number(row.total_questions ?? 0) || 0,
      totalPoints: scores.totalPoints,
      scoredPoints: scores.scoredPoints,
      percentage: scores.percentage,
      correctCount: scores.correctCount,
      incorrectCount: scores.incorrectCount,
      pdf: normalizePdfArtifacts(row),
      warningCount,
      requiresReview,
      isSharedToPool: Boolean(sharedExamId),
      sharedExamId,
    };
  });
};

export const listSharedMockExams = async (
  mode?: MockExamMode,
  limit = 24,
): Promise<MockExamSharedExamSummary[]> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  let query = externalSupabase
    .from(SHARED_POOL_TABLE)
    .select(
      "id, source_session_id, mode, topic, difficulty, selected_topics, config, exam_payload, pdf_drive_link, pdf_download_link, total_questions, total_marks, usage_count, created_at",
    )
    .eq("is_active", true)
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (mode) {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    console.error("[MockExam] Failed to load shared mock exams:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const normalizedMode = normalizeMode(row.mode);
    const warningCount = getStoredWorkflowWarnings(row).length;
    const requiresReview = getStoredRequiresReview(row);

    return {
      sharedExamId: row.id,
      sourceSessionId:
        typeof row.source_session_id === "string" ? row.source_session_id : null,
      mode: normalizedMode,
      topic: typeof row.topic === "string" ? row.topic : "Computer Networks",
      difficulty: normalizeDifficulty(row.difficulty),
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      selectedTopics: normalizeSelectedTopics(row.selected_topics),
      requestedCounts: getRequestedCounts(
        row.config,
        Number(row.total_questions ?? 0) || 0,
        normalizedMode,
      ),
      totalQuestions: Number(row.total_questions ?? 0) || 0,
      totalPoints: Number(row.total_marks ?? 0) || 0,
      pdf: normalizePdfArtifacts(row),
      warningCount,
      requiresReview,
      usageCount: Number(row.usage_count ?? 0) || 0,
    };
  });
};

export const publishMockExamToSharedPool = async (
  sessionId: string,
): Promise<MockExamShareResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for shared publish:", userError);
    return {
      status: "failed",
      sessionId,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId,
      reason: "No authenticated user session. Skipped publishing exam to the shared pool.",
    };
  }

  const { data: sessionRow, error: sessionError } = await externalSupabase
    .from("mock_exam_sessions")
    .select(
      "id, mode, topic, difficulty, selected_topics, config, exam_payload, pdf_drive_link, pdf_download_link, total_questions, total_marks",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !sessionRow) {
    console.error("[MockExam] Failed to load mock exam session for publishing:", sessionError);
    return {
      status: "failed",
      sessionId,
      reason: sessionError?.message ?? "Saved session could not be loaded for publishing.",
    };
  }

  const { data: questionRows, error: questionError } = await externalSupabase
    .from("mock_exam_questions")
    .select(
      "question_number, display_order, question_type, topic, marks, question_snapshot, answer_key_snapshot",
    )
    .eq("session_id", sessionId)
    .order("display_order", { ascending: true });

  if (questionError) {
    console.error("[MockExam] Failed to load mock exam questions for publishing:", questionError);
    return {
      status: "failed",
      sessionId,
      reason: questionError.message,
    };
  }

  const sharedPayload = buildSharedExamPayload(sessionRow, questionRows ?? []);
  const totalMarks =
    Number(sessionRow.total_marks ?? 0) || sumMarks(sharedPayload.structuredExam);

  const sharedExamRow = {
    owner_user_id: user.id,
    source_session_id: sessionRow.id,
    mode: normalizeMode(sessionRow.mode),
    topic: typeof sessionRow.topic === "string" ? sessionRow.topic : "Computer Networks",
    difficulty: normalizeDifficulty(sessionRow.difficulty),
    selected_topics: normalizeSelectedTopics(sessionRow.selected_topics),
    config: isRecord(sessionRow.config) ? sessionRow.config : {},
    exam_payload: sharedPayload,
    total_questions: Number(sessionRow.total_questions ?? 0) || 0,
    total_marks: totalMarks,
    pdf_drive_link: sharedPayload.pdf.link,
    pdf_download_link: sharedPayload.pdf.downloadLink,
    is_active: true,
  };

  const sharedPoolTable = externalSupabase.from(SHARED_POOL_TABLE);
  let sharedRow: { id?: string | null } | null = null;

  // Use a two-step update/insert flow so publishing works even when
  // source_session_id is backed by a partial unique index.
  const { data: existingSharedRow, error: existingSharedRowError } = await sharedPoolTable
    .select("id")
    .eq("source_session_id", sessionId)
    .maybeSingle();

  if (existingSharedRowError) {
    if (isMissingRelationError(existingSharedRowError)) {
      return {
        status: "failed",
        sessionId,
        reason: "Shared pool is not available yet. Run the shared-pool SQL migration first.",
      };
    }

    console.error("[MockExam] Failed to check existing shared exam:", existingSharedRowError);
    return {
      status: "failed",
      sessionId,
      reason: existingSharedRowError.message,
    };
  }

  if (existingSharedRow?.id) {
    const { data: updatedSharedRow, error: updateSharedRowError } = await sharedPoolTable
      .update(sharedExamRow)
      .eq("id", existingSharedRow.id)
      .eq("owner_user_id", user.id)
      .select("id")
      .single();

    if (updateSharedRowError) {
      if (isMissingRelationError(updateSharedRowError)) {
        return {
          status: "failed",
          sessionId,
          reason: "Shared pool is not available yet. Run the shared-pool SQL migration first.",
        };
      }

      console.error("[MockExam] Failed to update existing shared exam:", updateSharedRowError);
      return {
        status: "failed",
        sessionId,
        reason: updateSharedRowError.message,
      };
    }

    sharedRow = updatedSharedRow;
  } else {
    const { data: insertedSharedRow, error: insertSharedRowError } = await sharedPoolTable
      .insert(sharedExamRow)
      .select("id")
      .single();

    if (insertSharedRowError) {
      if (isMissingRelationError(insertSharedRowError)) {
        return {
          status: "failed",
          sessionId,
          reason: "Shared pool is not available yet. Run the shared-pool SQL migration first.",
        };
      }

      console.error("[MockExam] Failed to publish exam to shared pool:", insertSharedRowError);
      return {
        status: "failed",
        sessionId,
        reason: insertSharedRowError.message,
      };
    }

    sharedRow = insertedSharedRow;
  }

  return {
    status: "saved",
    sessionId,
    sharedExamId: sharedRow?.id ?? null,
  };
};

export const useSharedMockExam = async (
  sharedExamId: string,
): Promise<MockExamUseSharedResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for shared exam usage:", userError);
    return {
      status: "failed",
      sessionId: null,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId: null,
      reason: "No authenticated user session. Shared exams require sign-in.",
    };
  }

  const { data: sharedRow, error: sharedError } = await externalSupabase
    .from(SHARED_POOL_TABLE)
    .select(
      "id, source_session_id, mode, topic, difficulty, selected_topics, config, exam_payload, pdf_drive_link, pdf_download_link, total_questions, total_marks, usage_count",
    )
    .eq("id", sharedExamId)
    .eq("is_active", true)
    .single();

  if (sharedError || !sharedRow) {
    if (isMissingRelationError(sharedError)) {
      return {
        status: "failed",
        sessionId: null,
        reason: "Shared pool is not available yet. Run the shared-pool SQL migration first.",
      };
    }

    console.error("[MockExam] Failed to load shared mock exam:", sharedError);
    return {
      status: "failed",
      sessionId: null,
      reason: sharedError?.message ?? "Shared exam could not be loaded.",
    };
  }

  const sharedCatalog = buildNormalizedResponseFromCatalogRow(sharedRow, sharedExamId);
  const requestPayload = buildRequestFromCatalogRow(
    sharedRow,
    sharedCatalog.mode,
    sharedCatalog.requestedCounts,
  );
  const responseForPersistence: MockExamNormalizedResponse = {
    ...sharedCatalog.normalizedResponse,
    sessionId: requestPayload.sessionId,
  };

  const persistenceResult = await persistMockExamSession(requestPayload, responseForPersistence);
  const effectiveSessionId = persistenceResult.sessionId ?? responseForPersistence.sessionId;

  if (persistenceResult.status === "saved") {
    const nextUsageCount = (Number(sharedRow.usage_count ?? 0) || 0) + 1;
    const { error: usageUpdateError } = await externalSupabase
      .from(SHARED_POOL_TABLE)
      .update({
        usage_count: nextUsageCount,
      })
      .eq("id", sharedExamId);

    if (usageUpdateError && !isMissingRelationError(usageUpdateError)) {
      console.error("[MockExam] Failed to update shared exam usage count:", usageUpdateError);
    }
  }

  return {
    status: persistenceResult.status,
    sessionId: persistenceResult.sessionId,
    reason: persistenceResult.reason,
    mode: sharedCatalog.mode,
    topic: sharedCatalog.topic,
    difficulty: sharedCatalog.difficulty,
    selectedTopics: sharedCatalog.selectedTopics,
    normalizedResponse: {
      ...responseForPersistence,
      sessionId: effectiveSessionId,
    },
  };
};

export const deleteSavedMockExamSession = async (
  sessionId: string,
): Promise<MockExamPersistenceResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for session delete:", userError);
    return {
      status: "failed",
      sessionId,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId,
      reason: "No authenticated user session. Skipped deleting saved exam.",
    };
  }

  const { error: deleteError } = await externalSupabase
    .from("mock_exam_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[MockExam] Failed to delete saved mock exam session:", deleteError);
    return {
      status: "failed",
      sessionId,
      reason: deleteError.message,
    };
  }

  return {
    status: "saved",
    sessionId,
  };
};

export const updateSavedMockExamDraft = async (
  sessionId: string,
  input: {
    topic: string;
    structured: MockExamStructuredPayload;
  },
): Promise<MockExamPersistenceResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for draft update:", userError);
    return {
      status: "failed",
      sessionId,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId,
      reason: "No authenticated user session. Skipped saving edited draft.",
    };
  }

  const { data: sessionRow, error: sessionError } = await externalSupabase
    .from("mock_exam_sessions")
    .select(
      "id, mode, topic, difficulty, selected_topics, config, exam_payload, total_questions, total_marks",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !sessionRow) {
    console.error("[MockExam] Failed to load session for draft update:", sessionError);
    return {
      status: "failed",
      sessionId,
      reason: sessionError?.message ?? "Saved session could not be loaded for editing.",
    };
  }

  const mode = normalizeMode(sessionRow.mode);
  if (mode !== "exam_simulation") {
    return {
      status: "failed",
      sessionId,
      reason: "Only exam-simulation sessions support draft editing.",
    };
  }

  const topic =
    typeof input.topic === "string" && input.topic.trim()
      ? input.topic.trim()
      : typeof sessionRow.topic === "string" && sessionRow.topic.trim()
        ? sessionRow.topic.trim()
        : "Computer Networks";
  const difficulty = normalizeDifficulty(sessionRow.difficulty);
  const selectedTopics = normalizeSelectedTopics(sessionRow.selected_topics);
  const structured = input.structured;
  const requestedCounts = {
    mcq: structured.mcqs.length,
    openEnded: structured.longForm.length,
  };

  const requestLike: MockExamRequest = {
    mode,
    topic,
    numMultipleChoice: requestedCounts.mcq,
    numOpenEnded: requestedCounts.openEnded,
    difficulty,
    includeTopics: selectedTopics,
    excludeTopics: [],
    sessionId,
  };

  const responseLike: MockExamNormalizedResponse = {
    mode,
    sessionId,
    pdf: {
      link: null,
      downloadLink: null,
      fileId: null,
    },
    structured,
    practiceQuestions: toPracticeQuestions(structured, difficulty, topic),
    warnings: [],
    requiresReview: false,
    success: true,
    raw: {
      source: "edited_mock_exam_draft",
      sessionId,
    },
  };

  const updatedConfig = isRecord(sessionRow.config) ? { ...sessionRow.config } : {};
  const updatedExamPayload = isRecord(sessionRow.exam_payload)
    ? { ...sessionRow.exam_payload }
    : {};

  const { error: updateError } = await externalSupabase
    .from("mock_exam_sessions")
    .update({
      topic,
      config: {
        ...updatedConfig,
        requestedCounts,
        editedDraft: true,
        editedAt: new Date().toISOString(),
      },
      exam_payload: {
        ...updatedExamPayload,
        structuredExam: structured,
        pdf: {
          link: null,
          downloadLink: null,
          fileId: null,
        },
        success: true,
        requiresReview: false,
        warnings: [],
        raw: {
          source: "edited_mock_exam_draft",
          sessionId,
        },
        editedDraft: true,
        editedAt: new Date().toISOString(),
      },
      pdf_drive_link: null,
      pdf_download_link: null,
      total_questions: getTotalQuestions(requestLike, structured),
      total_marks: sumMarks(structured),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[MockExam] Failed to update edited draft session:", updateError);
    return {
      status: "failed",
      sessionId,
      reason: updateError.message,
    };
  }

  const { error: deleteQuestionsError } = await externalSupabase
    .from("mock_exam_questions")
    .delete()
    .eq("session_id", sessionId);

  if (deleteQuestionsError) {
    console.error("[MockExam] Failed to clear old draft question rows:", deleteQuestionsError);
    return {
      status: "failed",
      sessionId,
      reason: deleteQuestionsError.message,
    };
  }

  const questionRows = buildQuestionRows(sessionId, responseLike, requestLike);

  if (questionRows.length > 0) {
    const { error: insertQuestionsError } = await externalSupabase
      .from("mock_exam_questions")
      .insert(questionRows);

    if (insertQuestionsError) {
      console.error("[MockExam] Failed to persist edited draft question rows:", insertQuestionsError);
      return {
        status: "failed",
        sessionId,
        reason: insertQuestionsError.message,
      };
    }
  }

  return {
    status: "saved",
    sessionId,
  };
};

export const getSavedMockExamSession = async (
  sessionId: string,
): Promise<MockExamSavedSession | null> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: sessionRow, error: sessionError } = await externalSupabase
    .from("mock_exam_sessions")
    .select(
      "id, mode, status, topic, difficulty, selected_topics, config, result_summary, exam_payload, pdf_drive_link, pdf_download_link, total_questions, total_marks, created_at, started_at, submitted_at",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !sessionRow) {
    console.error("[MockExam] Failed to load saved mock exam session:", sessionError);
    return null;
  }

  const { data: questionRows, error: questionError } = await externalSupabase
    .from("mock_exam_questions")
    .select("question_number, display_order, question_type, topic, marks, question_snapshot, answer_key_snapshot")
    .eq("session_id", sessionId)
    .order("display_order", { ascending: true });

  if (questionError) {
    console.error("[MockExam] Failed to load saved mock exam questions:", questionError);
    return null;
  }

  const mode = normalizeMode(sessionRow.mode);
  const difficulty = normalizeDifficulty(sessionRow.difficulty);
  const structured = getStructuredPayloadFromSession(sessionRow, questionRows ?? []);
  const pdf = normalizePdfArtifacts(sessionRow);
  const topic = typeof sessionRow.topic === "string" ? sessionRow.topic : "Computer Networks";
  const scores = getSummaryScores(sessionRow);
  const requestedCounts = getRequestedCounts(sessionRow.config, Number(sessionRow.total_questions ?? 0) || 0, mode);
  const raw = getStoredRawResponse(sessionRow, {
    source: "saved_mock_exam_session",
    sessionId: sessionRow.id,
  });
  const warnings = getStoredWorkflowWarnings(sessionRow);
  const requiresReview = getStoredRequiresReview(sessionRow);
  const success = getStoredSuccess(sessionRow);

  const normalizedResponse: MockExamNormalizedResponse = {
    mode,
    sessionId: sessionRow.id,
    pdf,
    structured,
    practiceQuestions: toPracticeQuestions(structured, difficulty, topic),
    warnings,
    requiresReview,
    success,
    raw,
  };

  return {
    sessionId: sessionRow.id,
    mode,
    status: normalizeSessionStatus(sessionRow.status),
    topic,
    difficulty,
    createdAt:
      typeof sessionRow.created_at === "string" ? sessionRow.created_at : new Date().toISOString(),
    startedAt: typeof sessionRow.started_at === "string" ? sessionRow.started_at : null,
    submittedAt: typeof sessionRow.submitted_at === "string" ? sessionRow.submitted_at : null,
    selectedTopics: Array.isArray(sessionRow.selected_topics)
      ? sessionRow.selected_topics.filter((item): item is string => typeof item === "string")
      : [],
    requestedCounts,
    totalQuestions: Number(sessionRow.total_questions ?? 0) || 0,
    totalPoints: scores.totalPoints,
    scoredPoints: scores.scoredPoints,
    percentage: scores.percentage,
    correctCount: scores.correctCount,
    incorrectCount: scores.incorrectCount,
    normalizedResponse,
  };
};

export const completeQuickPracticeSession = async (
  input: QuickPracticeCompletionInput,
): Promise<MockExamPersistenceResult> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError) {
    console.error("[MockExam] Failed to resolve current user for completion persistence:", userError);
    return {
      status: "failed",
      sessionId: input.sessionId,
      reason: userError.message,
    };
  }

  if (!user) {
    return {
      status: "skipped",
      sessionId: input.sessionId,
      reason: "No authenticated user session. Skipped saving completed quick practice review.",
    };
  }

  const submittedAt = new Date().toISOString();
  const { data: questionRows, error: questionError } = await externalSupabase
    .from("mock_exam_questions")
    .select("id, question_number")
    .eq("session_id", input.sessionId);

  if (questionError) {
    console.error("[MockExam] Failed to load persisted question ids for completion:", questionError);
    return {
      status: "failed",
      sessionId: input.sessionId,
      reason: questionError.message,
    };
  }

  const questionIdByNumber = new Map<number, string>();
  for (const row of questionRows ?? []) {
    if (typeof row.question_number === "number" && typeof row.id === "string") {
      questionIdByNumber.set(row.question_number, row.id);
    }
  }

  const answerRows = input.answers.flatMap((answer) => {
    const questionId = questionIdByNumber.get(answer.questionId);
    const question = input.questions.find((item) => item.id === answer.questionId);

    if (!questionId || !question) {
      return [];
    }

    const selectedOptionIndex =
      typeof answer.selectedOptionIndex === "number" ? answer.selectedOptionIndex : null;
    const selectedOptionText =
      selectedOptionIndex !== null ? question.options[selectedOptionIndex] ?? answer.answer : answer.answer;

    return [{
      session_id: input.sessionId,
      question_id: questionId,
      answer_text: selectedOptionText,
      answer_json: {
        selectedOptionIndex,
        selectedOptionText,
        correctAnswerIndex: question.correctAnswer ?? null,
        correctAnswerText: question.correctAnswerText ?? null,
        isCorrect: answer.isCorrect,
      },
      feedback: {
        explanation: question.explanation ?? null,
      },
      is_final: true,
      grading_status: "auto_graded",
      score_earned: answer.pointsEarned,
      submitted_at: answer.submittedAt ?? submittedAt,
    }];
  });

  if (answerRows.length > 0) {
    const { error: answerInsertError } = await externalSupabase
      .from("mock_exam_answers")
      .insert(answerRows);

    if (answerInsertError) {
      console.error("[MockExam] Failed to persist completed quick practice answers:", answerInsertError);
      return {
        status: "failed",
        sessionId: input.sessionId,
        reason: answerInsertError.message,
      };
    }
  }

  const resultSummary = buildResultSummary(input.answers, input.scoredPoints, input.totalPoints);
  const durationSeconds =
    typeof input.elapsedSeconds === "number" && input.elapsedSeconds > 0
      ? Math.max(1, Math.round(input.elapsedSeconds))
      : null;

  const { error: sessionUpdateError } = await externalSupabase
    .from("mock_exam_sessions")
    .update({
      status: "submitted",
      progress_state: {
        currentQuestionIndex: Math.max(0, input.questions.length - 1),
        answers: Object.fromEntries(
          input.answers.map((answer) => [
            answer.questionId,
            {
              answer: answer.answer,
              selectedOptionIndex: answer.selectedOptionIndex ?? null,
              isCorrect: answer.isCorrect,
              pointsEarned: answer.pointsEarned,
            },
          ]),
        ),
        flaggedQuestionIds: [],
        startedInApp: true,
        completedInApp: true,
      },
      result_summary: resultSummary,
      duration_seconds: durationSeconds,
      submitted_at: submittedAt,
    })
    .eq("id", input.sessionId)
    .eq("user_id", user.id);

  if (sessionUpdateError) {
    console.error("[MockExam] Failed to update quick practice session summary:", sessionUpdateError);
    return {
      status: "failed",
      sessionId: input.sessionId,
      reason: sessionUpdateError.message,
    };
  }

  return {
    status: "saved",
    sessionId: input.sessionId,
  };
};

export const listQuickPracticeHistory = async (
  limit = 8,
): Promise<MockExamHistorySummary[]> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await externalSupabase
    .from("mock_exam_sessions")
    .select(
      "id, topic, difficulty, selected_topics, total_questions, total_marks, result_summary, created_at, submitted_at",
    )
    .eq("user_id", user.id)
    .eq("mode", "quick_practice")
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[MockExam] Failed to load quick practice history:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const resultSummary = isRecord(row.result_summary) ? row.result_summary : {};
    const scoredPoints = Number(resultSummary.scoredPoints ?? 0) || 0;
    const totalPoints = Number(resultSummary.totalPoints ?? row.total_marks ?? 0) || 0;
    const percentage =
      Number(resultSummary.percentage ?? (totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0)) || 0;
    const correctCount = Number(resultSummary.correctCount ?? 0) || 0;
    const incorrectCount = Number(resultSummary.incorrectCount ?? 0) || 0;

    return {
      sessionId: row.id,
      topic: typeof row.topic === "string" ? row.topic : "Computer Networks",
      difficulty:
        row.difficulty === "easy" || row.difficulty === "medium" || row.difficulty === "hard"
          ? row.difficulty
          : "medium",
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      totalQuestions: Number(row.total_questions ?? 0) || 0,
      totalPoints,
      scoredPoints,
      percentage,
      correctCount,
      incorrectCount,
      selectedTopics: Array.isArray(row.selected_topics)
        ? row.selected_topics.filter((topic): topic is string => typeof topic === "string")
        : [],
    };
  });
};

export const getQuickPracticeReview = async (
  sessionId: string,
): Promise<MockExamReviewRecord | null> => {
  const {
    data: { user },
    error: userError,
  } = await externalSupabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: sessionRow, error: sessionError } = await externalSupabase
    .from("mock_exam_sessions")
    .select("id, topic, difficulty, selected_topics, total_marks, result_summary, created_at, submitted_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !sessionRow) {
    console.error("[MockExam] Failed to load quick practice review session:", sessionError);
    return null;
  }

  const { data: questionRows, error: questionError } = await externalSupabase
    .from("mock_exam_questions")
    .select("id, question_number, topic, marks, question_snapshot, answer_key_snapshot")
    .eq("session_id", sessionId)
    .order("display_order", { ascending: true });

  if (questionError) {
    console.error("[MockExam] Failed to load quick practice review questions:", questionError);
    return null;
  }

  const { data: answerRows, error: answerError } = await externalSupabase
    .from("mock_exam_answers")
    .select("question_id, answer_text, answer_json, score_earned, submitted_at")
    .eq("session_id", sessionId)
    .eq("is_final", true);

  if (answerError) {
    console.error("[MockExam] Failed to load quick practice review answers:", answerError);
    return null;
  }

  const questions = (questionRows ?? []).map((row) => {
    const question = toRunnerQuestionFromRow(row);

    return {
      ...question,
      difficulty:
        sessionRow.difficulty === "easy" ||
        sessionRow.difficulty === "medium" ||
        sessionRow.difficulty === "hard"
          ? sessionRow.difficulty
          : "medium",
    };
  });

  const answerRowByQuestionId = new Map<string, Record<string, any>>();
  for (const row of answerRows ?? []) {
    if (typeof row.question_id === "string") {
      answerRowByQuestionId.set(row.question_id, row);
    }
  }

  const answers = (questionRows ?? []).map((row) => {
    const answerRow = typeof row.id === "string" ? answerRowByQuestionId.get(row.id) : undefined;
    const answerJson = isRecord(answerRow?.answer_json) ? answerRow.answer_json : {};

    return {
      questionId: Number(row.question_number),
      answer: typeof answerRow?.answer_text === "string" ? answerRow.answer_text : "",
      isCorrect: Boolean(answerJson.isCorrect),
      pointsEarned: Number(answerRow?.score_earned ?? 0) || 0,
      selectedOptionIndex:
        typeof answerJson.selectedOptionIndex === "number" ? answerJson.selectedOptionIndex : null,
      submittedAt: typeof answerRow?.submitted_at === "string" ? answerRow.submitted_at : null,
    };
  });

  const resultSummary = isRecord(sessionRow.result_summary) ? sessionRow.result_summary : {};
  const scoredPoints = Number(resultSummary.scoredPoints ?? 0) || 0;
  const totalPoints = Number(resultSummary.totalPoints ?? sessionRow.total_marks ?? 0) || 0;

  return {
    sessionId: sessionRow.id,
    topic: typeof sessionRow.topic === "string" ? sessionRow.topic : "Computer Networks",
    difficulty:
      sessionRow.difficulty === "easy" ||
      sessionRow.difficulty === "medium" ||
      sessionRow.difficulty === "hard"
        ? sessionRow.difficulty
        : "medium",
    createdAt:
      typeof sessionRow.created_at === "string" ? sessionRow.created_at : new Date().toISOString(),
    submittedAt: typeof sessionRow.submitted_at === "string" ? sessionRow.submitted_at : null,
    selectedTopics: Array.isArray(sessionRow.selected_topics)
      ? sessionRow.selected_topics.filter((topic): topic is string => typeof topic === "string")
      : [],
    questions,
    answers,
    totalPoints,
    scoredPoints,
  };
};
