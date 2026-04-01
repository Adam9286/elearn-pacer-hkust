import type {
  MockExamMcq,
  MockExamStructuredPayload,
} from "@/types/mockExam";

export const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const dedupeStrings = (items: string[]) => [...new Set(items.filter(Boolean))];

const extractMetadataWarnings = (metadata: unknown): string[] => {
  if (!isRecord(metadata)) {
    return [];
  }

  const warnings: string[] = [];

  if (isRecord(metadata.exportAudit)) {
    warnings.push(...normalizeStringArray(metadata.exportAudit.exportBlockingIssues));
  }

  if (isRecord(metadata.qualityAudit) && Array.isArray(metadata.qualityAudit.issues)) {
    for (const issue of metadata.qualityAudit.issues) {
      if (isRecord(issue) && typeof issue.message === "string" && issue.message.trim()) {
        warnings.push(issue.message.trim());
      }
    }
  }

  return warnings;
};

export const extractStructuredPayload = (value: unknown): MockExamStructuredPayload | null => {
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

export const extractMockExamWarnings = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  const warnings: string[] = [];

  warnings.push(...normalizeStringArray(value.warnings));

  const structured = extractStructuredPayload(value);
  warnings.push(...extractMetadataWarnings(structured?.metadata));

  const nestedCandidates = ["exam", "structuredExam", "examData", "data", "payload", "raw"];
  for (const key of nestedCandidates) {
    const nested = value[key];
    if (!isRecord(nested)) {
      continue;
    }

    warnings.push(...normalizeStringArray(nested.warnings));

    const nestedStructured = extractStructuredPayload(nested);
    warnings.push(...extractMetadataWarnings(nestedStructured?.metadata));
  }

  return dedupeStrings(warnings);
};

export const extractMockExamRequiresReview = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.requiresReview === true) {
    return true;
  }

  const candidates = [value, value.exam, value.raw].filter(isRecord);
  for (const candidate of candidates) {
    const structured = extractStructuredPayload(candidate);
    const metadata = isRecord(structured?.metadata) ? structured.metadata : null;

    if (
      isRecord(metadata?.qualityAudit) &&
      Number(metadata.qualityAudit.criticalIssueCount ?? 0) > 0
    ) {
      return true;
    }

    if (
      isRecord(metadata?.exportAudit) &&
      Number(metadata.exportAudit.blockingIssueCount ?? 0) > 0
    ) {
      return true;
    }
  }

  return false;
};

export const extractMockExamSuccess = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return true;
  }

  if (typeof value.success === "boolean") {
    return value.success;
  }

  if (isRecord(value.raw) && typeof value.raw.success === "boolean") {
    return value.raw.success;
  }

  return true;
};
