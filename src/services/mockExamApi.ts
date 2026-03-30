import { WEBHOOKS } from "@/constants/api";
import type {
  MockExamDifficulty,
  MockExamMcq,
  MockExamNormalizedResponse,
  MockExamPdfArtifacts,
  MockExamRequest,
  MockExamRunnerQuestion,
  MockExamStructuredPayload,
} from "@/types/mockExam";

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const parseJsonResponse = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText || responseText.trim() === "") {
    throw new Error(
      "n8n webhook returned empty response. Make sure the workflow is active (not in test mode) and the 'Respond to Webhook' node is configured correctly.",
    );
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error("[MockExam] Failed to parse response:", responseText);
    throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}`);
  }
};

const normalizePdfArtifacts = (value: unknown): MockExamPdfArtifacts => {
  const record = isRecord(value) ? value : {};
  const pdfRecord = isRecord(record.pdf) ? record.pdf : null;
  const source = pdfRecord ?? record;

  let fileId = typeof source.fileId === "string" ? source.fileId.trim() : null;
  let link = typeof source.link === "string" ? source.link.trim() : null;
  let downloadLink =
    typeof source.downloadLink === "string" ? source.downloadLink.trim() : null;

  if (!fileId && typeof source.id === "string") {
    fileId = source.id.trim();
  }

  if (!link && typeof source.webViewLink === "string") {
    link = source.webViewLink.trim();
  }

  if (!downloadLink && typeof source.webContentLink === "string") {
    downloadLink = source.webContentLink.trim();
  }

  if (!fileId && link) {
    const match = link.match(/\/d\/([^/]+)/);
    if (match) {
      fileId = match[1];
    }
  }

  if (fileId && (!link || !link.startsWith("http"))) {
    link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  if (fileId && (!downloadLink || !downloadLink.startsWith("http"))) {
    downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return {
    fileId: fileId || null,
    link: link && link.startsWith("http") ? link : null,
    downloadLink:
      downloadLink && downloadLink.startsWith("http") ? downloadLink : null,
  };
};

const extractStructuredPayload = (value: unknown): MockExamStructuredPayload | null => {
  if (!isRecord(value)) {
    return null;
  }

  const mcqs = Array.isArray(value.mcqs) ? value.mcqs : null;
  const longForm = Array.isArray(value.longForm) ? value.longForm : null;

  if (mcqs || longForm) {
    return {
      mcqs: (mcqs ?? []) as MockExamMcq[],
      longForm: (longForm ?? []) as MockExamStructuredPayload["longForm"],
      metadata: isRecord(value.metadata) ? value.metadata : undefined,
    };
  }

  const nestedCandidates = ["exam", "structuredExam", "examData", "data", "payload"];

  for (const key of nestedCandidates) {
    const nested = value[key];
    if (isRecord(nested)) {
      const extracted = extractStructuredPayload(nested);
      if (extracted) {
        return extracted;
      }
    }
  }

  return null;
};

const correctAnswerLetterToIndex = (answer?: string) => {
  if (!answer) {
    return undefined;
  }

  const normalized = answer.trim().toUpperCase();
  const index = normalized.charCodeAt(0) - 65;

  return index >= 0 ? index : undefined;
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
    options: question.options ?? [],
    correctAnswer: correctAnswerLetterToIndex(question.correct_answer),
    correctAnswerText: question.correct_answer,
    explanation: question.explanation,
    points: question.marks ?? 2,
  }));
};

export const requestMockExam = async (
  payload: MockExamRequest,
): Promise<MockExamNormalizedResponse> => {
  const response = await fetch(WEBHOOKS.EXAM_GENERATOR, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to generate exam (${response.status})`);
  }

  const result = await parseJsonResponse(response);
  const structured = extractStructuredPayload(result);
  const pdf = normalizePdfArtifacts(result);
  const practiceQuestions = toPracticeQuestions(structured, payload.difficulty, payload.topic);

  return {
    mode: payload.mode,
    sessionId:
      (isRecord(result) && typeof result.sessionId === "string" && result.sessionId) ||
      payload.sessionId,
    pdf,
    structured,
    practiceQuestions,
    raw: result,
  };
};
