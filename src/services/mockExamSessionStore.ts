import { externalSupabase } from "@/lib/externalSupabase";
import type {
  MockExamLongForm,
  MockExamMode,
  MockExamNormalizedResponse,
  MockExamRequest,
  MockExamStructuredPayload,
} from "@/types/mockExam";

type PersistenceStatus = "saved" | "skipped" | "failed";

export interface MockExamPersistenceResult {
  status: PersistenceStatus;
  sessionId: string | null;
  reason?: string;
}

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
