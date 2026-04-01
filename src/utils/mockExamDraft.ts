import mermaid from "mermaid";
import type {
  MockExamDifficulty,
  MockExamImageAsset,
  MockExamLongForm,
  MockExamStructuredPayload,
} from "@/types/mockExam";

let mermaidInitialized = false;
let mermaidRenderId = 0;

const ensureMermaidInitialized = () => {
  if (mermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "Times New Roman, Georgia, serif",
  });

  mermaidInitialized = true;
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatOptionForDisplay = (option: string, index: number) => {
  const trimmed = option.trim();
  if (/^[A-Z][).:]\s/.test(trimmed)) {
    return option;
  }

  return `${String.fromCharCode(65 + index)}) ${option}`;
};

const normalizeSvg = (svg: string) =>
  svg
    .trim()
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<style[^>]*>\s*@import[\s\S]*?<\/style>/gi, "")
    .replace(/@import\s+url\([^)]+\);?/gi, "")
    .trim();

const looksLikeMermaidDiagram = (diagram?: string | null) => {
  if (!diagram || !diagram.trim()) {
    return false;
  }

  const normalized = diagram
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return /^(graph\s+(?:LR|RL|TB|TD|BT)|flowchart\s+(?:LR|RL|TB|TD|BT)|sequenceDiagram|classDiagram|stateDiagram)/.test(
    normalized,
  );
};

const renderMermaidSvg = async (diagram?: string | null) => {
  if (!diagram || !diagram.trim()) {
    return null;
  }

  ensureMermaidInitialized();

  try {
    const { svg } = await mermaid.render(
      `mock-exam-print-${++mermaidRenderId}`,
      diagram.trim(),
    );
    return normalizeSvg(svg);
  } catch (error) {
    console.error("[MockExam] Failed to render Mermaid diagram for print:", error);
    return null;
  }
};

const buildDiagramFallback = (diagram?: string | null) => {
  if (!diagram || !diagram.trim()) {
    return "";
  }

  return `<pre class="diagram-fallback">${escapeHtml(diagram)}</pre>`;
};

const normalizeImageWidthPercent = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(Math.max(Math.round(value), 20), 100);
};

const isRenderableImageUrl = (value?: string | null) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed);
};

const extractQuestionPrompt = (question: MockExamLongForm) =>
  [question.question, ...(question.sub_parts ?? []).map((part) => part.text)].join(" ");

const normalizeBandwidthToMbps = (value: number, unit: string) => {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === "gbps") {
    return value * 1000;
  }

  if (normalizedUnit === "kbps") {
    return value / 1000;
  }

  return value;
};

const extractLinkBandwidthMbps = (prompt: string, linkNumber: 1 | 2) => {
  const regex = new RegExp(
    `Link\\s*${linkNumber}[\\s\\S]{0,160}?(\\d+(?:\\.\\d+)?)\\s*(Kbps|Mbps|Gbps)`,
    "i",
  );
  const match = prompt.match(regex);
  if (!match) {
    return null;
  }

  return normalizeBandwidthToMbps(Number(match[1]), match[2]);
};

const hasStopAndWaitContradiction = (question: MockExamLongForm) => {
  const prompt = extractQuestionPrompt(question);
  const diagram = question.diagram ?? "";

  if (!/stop-and-wait|stop and wait/i.test(prompt) || !/^sequenceDiagram\b/.test(diagram.trim())) {
    return false;
  }

  const lines = diagram
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const outstandingDataLabels = new Set<string>();

  for (const line of lines) {
    const messageMatch = line.match(/^[A-Za-z0-9_]+[-=.]+>?[A-Za-z0-9_]+:\s*(.+)$/);
    if (!messageMatch) {
      continue;
    }

    const message = messageMatch[1].trim();
    const normalizedMessage = message.replace(/\s+/g, " ").toLowerCase();

    if (/\back\b/.test(normalizedMessage) && !/\bdata\b/.test(normalizedMessage)) {
      outstandingDataLabels.clear();
      continue;
    }

    if (/\bdata\b|\bseg(?:ment)?\b|\bpkt\b|\bpacket\b|\bpayload\b/.test(normalizedMessage) && !/\back\b/.test(normalizedMessage)) {
      outstandingDataLabels.add(normalizedMessage);

      if (outstandingDataLabels.size > 1) {
        return true;
      }
    }
  }

  return false;
};

const hasImpossibleQueueBuildup = (question: MockExamLongForm) => {
  const prompt = extractQuestionPrompt(question);

  if (!/queue buildup|queue build-up|queue build up|queue overflow|router overflow|buffer overflow|rate of queue buildup/i.test(prompt)) {
    return false;
  }

  const link1Mbps = extractLinkBandwidthMbps(prompt, 1);
  const link2Mbps = extractLinkBandwidthMbps(prompt, 2);

  if (link1Mbps == null || link2Mbps == null) {
    return false;
  }

  return link2Mbps > link1Mbps;
};

const findInlineSubpartMarkerIndex = (questionText?: string | null) => {
  if (!questionText) {
    return -1;
  }

  const markerPatterns = [
    /\(\s*[a-zA-Z]\s*\)/m,
    /(?:^|\n)\s*[a-zA-Z][).]\s+/m,
  ];

  for (const pattern of markerPatterns) {
    const match = questionText.match(pattern);
    if (match && typeof match.index === "number") {
      return match.index;
    }
  }

  return -1;
};

const stripInlineSubpartsFromQuestion = (questionText?: string | null) => {
  if (!questionText) {
    return "";
  }

  const markerIndex = findInlineSubpartMarkerIndex(questionText);
  if (markerIndex === -1) {
    return questionText.trim();
  }

  return questionText.slice(0, markerIndex).replace(/\s{2,}/g, " ").trim();
};

const renderQuestionImages = (images?: MockExamImageAsset[]) => {
  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }

  const renderedImages = images
    .filter((image) => isRenderableImageUrl(image?.url))
    .map((image) => {
      const widthPercent = normalizeImageWidthPercent(image.widthPercent);
      const altText = image.alt?.trim() || image.caption?.trim() || "Question image";

      return `<figure class="question-image" style="max-width:${widthPercent}%;">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(altText)}" />
        ${image.caption?.trim() ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
      </figure>`;
    })
    .join("");

  if (!renderedImages) {
    return "";
  }

  return `<div class="question-images">${renderedImages}</div>`;
};

export const cloneStructuredPayload = (
  structured: MockExamStructuredPayload | null,
): MockExamStructuredPayload | null =>
  structured
    ? JSON.parse(JSON.stringify(structured))
    : null;

export const getMockExamDraftWarnings = (
  structured: MockExamStructuredPayload | null,
): string[] => {
  if (!structured) {
    return [];
  }

  const warnings: string[] = [];

  for (const question of structured.longForm) {
    const prompt = extractQuestionPrompt(question);
    const diagram = question.diagram ?? "";

    if (/refer to the diagram below\./i.test(question.question) && !diagram.trim()) {
      warnings.push(
        `Question ${question.number} references a diagram, but the diagram field is empty.`,
      );
    }

    if (
      /fill in|seq|ack|sequence number|acknowledgment number/i.test(prompt) &&
      /\bSeq\s*=|\bAck\s*=|\bSEQ\s*=|\bACK\s*=/i.test(diagram)
    ) {
      warnings.push(
        `Question ${question.number} looks like a TCP fill-in problem, but the diagram already contains Seq/Ack values.`,
      );
    }

    if (/symmetric/i.test(prompt) && /-->/i.test(diagram)) {
      warnings.push(
        `Question ${question.number} says the links are symmetric, but the Mermaid diagram uses directed arrows.`,
      );
    }

    if (findInlineSubpartMarkerIndex(question.question) !== -1) {
      warnings.push(
        `Question ${question.number} has sub-part markers inside the question stem instead of keeping them only in sub_parts.`,
      );
    }

    if (diagram.trim() && !looksLikeMermaidDiagram(diagram)) {
      warnings.push(
        `Question ${question.number} diagram is plain text or invalid Mermaid, so it may print as an unprofessional fallback instead of a rendered figure.`,
      );
    }

    if (hasStopAndWaitContradiction(question)) {
      warnings.push(
        `Question ${question.number} says to assume stop-and-wait, but the sequence diagram shows multiple data sends before an ACK.`,
      );
    }

    if (hasImpossibleQueueBuildup(question)) {
      warnings.push(
        `Question ${question.number} asks about queue buildup or overflow, but the stated link rates suggest the outgoing link is faster than the incoming link.`,
      );
    }

    for (const [imageIndex, image] of (question.images ?? []).entries()) {
      if (!isRenderableImageUrl(image?.url)) {
        warnings.push(
          `Question ${question.number} image ${imageIndex + 1} does not have a printable URL. Use https:// or data:image/.`,
        );
      }
    }
  }

  for (const question of structured.mcqs) {
    for (const [imageIndex, image] of (question.images ?? []).entries()) {
      if (!isRenderableImageUrl(image?.url)) {
        warnings.push(
          `MCQ ${question.number} image ${imageIndex + 1} does not have a printable URL. Use https:// or data:image/.`,
        );
      }
    }
  }

  return warnings;
};

const removeEmptyDiagramReference = (questionText: string, diagram?: string | null) => {
  if (diagram && diagram.trim()) {
    return questionText;
  }

  return questionText
    .replace(/\s*Refer to the diagram below\.\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const redactTcpAnswerValues = (diagram?: string | null) => {
  if (!diagram || !diagram.trim()) {
    return diagram ?? null;
  }

  return diagram
    .replace(/\bSeq\s*=\s*[^,\n]+/gi, "Seq=?")
    .replace(/\bAck\s*=\s*[^,\n]+/gi, "Ack=?");
};

const normalizeSymmetricLinks = (diagram?: string | null) => {
  if (!diagram || !diagram.trim()) {
    return diagram ?? null;
  }

  return diagram.replace(/-->/g, "---").replace(/==>/g, "===");
};

const autoFixLongFormQuestion = (question: MockExamLongForm) => {
  const prompt = [question.question, ...(question.sub_parts ?? []).map((part) => part.text)].join(" ");
  let nextQuestion = question.question;
  let nextDiagram = question.diagram ?? null;
  const changes: string[] = [];

  const withoutReference = removeEmptyDiagramReference(nextQuestion, nextDiagram);
  if (withoutReference !== nextQuestion) {
    nextQuestion = withoutReference;
    changes.push(`Question ${question.number}: removed diagram reference because the diagram was empty.`);
  }

  const withoutInlineSubparts = stripInlineSubpartsFromQuestion(nextQuestion);
  if (withoutInlineSubparts !== nextQuestion) {
    nextQuestion = withoutInlineSubparts;
    changes.push(`Question ${question.number}: removed inline sub-part markers from the question stem.`);
  }

  if (
    /fill in|seq|ack|sequence number|acknowledgment number/i.test(prompt) &&
    /\bSeq\s*=|\bAck\s*=|\bSEQ\s*=|\bACK\s*=/i.test(nextDiagram ?? "")
  ) {
    const redactedDiagram = redactTcpAnswerValues(nextDiagram);
    if (redactedDiagram !== nextDiagram) {
      nextDiagram = redactedDiagram;
      changes.push(`Question ${question.number}: replaced visible Seq/Ack values with placeholders.`);
    }
  }

  if (/symmetric/i.test(prompt) && /-->|==>/.test(nextDiagram ?? "")) {
    const normalizedDiagram = normalizeSymmetricLinks(nextDiagram);
    if (normalizedDiagram !== nextDiagram) {
      nextDiagram = normalizedDiagram;
      changes.push(`Question ${question.number}: converted directed arrows to undirected links for a symmetric topology.`);
    }
  }

  return {
    question: {
      ...question,
      question: nextQuestion,
      diagram: nextDiagram,
    },
    changes,
  };
};

export const applyMockExamDraftAutofixes = (
  structured: MockExamStructuredPayload | null,
): { structured: MockExamStructuredPayload | null; changes: string[] } => {
  if (!structured) {
    return {
      structured,
      changes: [],
    };
  }

  const changes: string[] = [];
  const nextLongForm = structured.longForm.map((question) => {
    const result = autoFixLongFormQuestion(question);
    changes.push(...result.changes);
    return result.question;
  });

  return {
    structured: {
      ...cloneStructuredPayload(structured)!,
      longForm: nextLongForm,
    },
    changes,
  };
};

export const buildPrintableMockExamHtml = async ({
  topic,
  difficulty,
  structured,
}: {
  topic: string;
  difficulty: MockExamDifficulty;
  structured: MockExamStructuredPayload;
}) => {
  const renderedDiagrams = await Promise.all(
    structured.longForm.map((question) => renderMermaidSvg(question.diagram)),
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalMarks =
    structured.mcqs.reduce((sum, question) => sum + (question.marks ?? 2), 0) +
    structured.longForm.reduce((sum, question) => sum + (question.marks ?? 0), 0);

  const estimatedTime = Math.round(
    structured.mcqs.length * 1.5 +
      structured.longForm.reduce(
        (sum, question) => sum + Math.max(question.sub_parts?.length ?? 2, 2) * 3,
        0,
      ),
  );

  const mcqHtml = structured.mcqs
    .map(
      (question) => `
      <div class="question">
        <div class="q-head">
          <span class="q-num">Question ${question.number}</span>
          <span class="marks">[${question.marks ?? 2} marks]</span>
        </div>
        <p>${escapeHtml(question.question)}</p>
        ${renderQuestionImages(question.images)}
        <div class="options">
          ${(question.options ?? [])
            .map(
              (option, index) =>
                `<div class="opt">${escapeHtml(formatOptionForDisplay(option, index))}</div>`,
            )
            .join("")}
        </div>
      </div>`,
    )
    .join("");

  const longFormHtml = structured.longForm
    .map((question, index) => {
      const diagramSvg = renderedDiagrams[index];
      const diagramHtml = diagramSvg
        ? `<div class="diagram-container"><div class="diagram-svg">${diagramSvg}</div><div class="diagram-caption">Figure for Question ${question.number}</div></div>`
        : buildDiagramFallback(question.diagram);

      const partsHtml = (question.sub_parts ?? [])
        .map(
          (part) => `
            <div class="sub">
              <span class="sub-l">(${escapeHtml(part.label)})</span>
              <span class="sub-t">${escapeHtml(part.text)}</span>
              <span class="marks">[${part.marks} marks]</span>
            </div>`,
        )
        .join("");

      return `
        <div class="question">
          <div class="q-head">
            <span class="q-num">Question ${question.number}</span>
            <span class="marks">[${question.marks ?? 0} marks]</span>
          </div>
          <p>${escapeHtml(question.question)}</p>
          ${renderQuestionImages(question.images)}
          ${diagramHtml}
          ${partsHtml}
          <div class="ans-space"></div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(topic)} Draft Exam</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", Georgia, serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
    .cover { text-align: center; padding: 50px 20px; page-break-after: always; }
    .cover .uni { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .cover .dept { font-size: 11pt; color: #444; margin: 4px 0 35px; }
    .cover .code { font-size: 24pt; font-weight: bold; margin-bottom: 4px; }
    .cover .name { font-size: 16pt; margin-bottom: 30px; }
    .cover .etype { font-size: 14pt; font-weight: bold; border: 2px solid #333; display: inline-block; padding: 8px 35px; margin: 15px 0 30px; letter-spacing: 1px; }
    .info { margin: 0 auto; font-size: 11pt; text-align: left; max-width: 360px; }
    .info tr td { padding: 4px 12px; }
    .info tr td:first-child { font-weight: bold; text-align: right; }
    .sec-title { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 30px 0 18px; }
    .page-break { page-break-before: always; }
    .question { margin-bottom: 24px; page-break-inside: avoid; }
    .q-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
    .q-num { font-weight: bold; }
    .marks { font-size: 10pt; color: #555; font-style: italic; }
    .options { margin: 6px 0 0 22px; }
    .opt { margin: 2px 0; }
    .sub { margin: 6px 0 6px 22px; display: flex; gap: 8px; align-items: baseline; }
    .sub-l { font-weight: bold; min-width: 28px; }
    .sub-t { flex: 1; }
    .diagram-container { text-align: center; margin: 15px 0; padding: 10px; border: 1px solid #eee; background: #fafafa; }
    .diagram-container svg { max-width: 100%; height: auto; }
    .diagram-svg { text-align: center; margin: 10px 0; }
    .diagram-caption { margin-top: 8px; font-size: 9pt; color: #666; font-style: italic; }
    .diagram-fallback { margin: 12px 0; padding: 12px; border: 1px dashed #999; background: #fafafa; white-space: pre-wrap; font-family: Consolas, monospace; font-size: 9pt; }
    .question-images { display: grid; gap: 12px; margin: 12px 0; justify-items: center; }
    .question-image { width: 100%; margin: 0 auto; }
    .question-image img { width: 100%; height: auto; border: 1px solid #ddd; display: block; }
    .question-image figcaption { margin-top: 6px; font-size: 9pt; color: #666; font-style: italic; text-align: center; }
    .ans-space { height: 80px; border-bottom: 1px dashed #bbb; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="uni">Hong Kong University of Science and Technology</div>
    <div class="dept">Department of Electronic and Computer Engineering</div>
    <div class="code">ELEC3120</div>
    <div class="name">${escapeHtml(topic)}</div>
    <div class="etype">EDITABLE PRACTICE EXAMINATION</div>
    <table class="info">
      <tr><td>Date:</td><td>${escapeHtml(dateStr)}</td></tr>
      <tr><td>Difficulty:</td><td>${escapeHtml(difficulty.charAt(0).toUpperCase() + difficulty.slice(1))}</td></tr>
      <tr><td>Total Questions:</td><td>${structured.mcqs.length + structured.longForm.length}</td></tr>
      <tr><td>Total Marks:</td><td>${totalMarks}</td></tr>
      <tr><td>Estimated Time:</td><td>${estimatedTime} minutes</td></tr>
    </table>
  </div>

  <div class="sec-title">SECTION A - Multiple Choice Questions (${structured.mcqs.length} questions)</div>
  ${mcqHtml}

  <div class="sec-title page-break">SECTION B - Open-Ended Questions (${structured.longForm.length} questions)</div>
  ${longFormHtml}
</body>
</html>`;
};

export const printStructuredMockExam = async ({
  topic,
  difficulty,
  structured,
}: {
  topic: string;
  difficulty: MockExamDifficulty;
  structured: MockExamStructuredPayload;
}) => {
  const html = await buildPrintableMockExamHtml({ topic, difficulty, structured });
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");

  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow pop-ups for this site.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 300);
};
