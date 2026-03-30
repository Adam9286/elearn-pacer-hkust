import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_WEBHOOK_URL =
  "https://smellycat9286.app.n8n.cloud/webhook-test/exam-generator";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseJsonResponse = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText || responseText.trim() === "") {
    throw new Error("n8n returned an empty response.");
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error("[generate-exam] Invalid JSON from n8n:", responseText);
    throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 120)}`);
  }
};

const normalizePdfArtifacts = (value: unknown) => {
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

const extractStructuredPayload = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) {
    return null;
  }

  const mcqs = Array.isArray(value.mcqs) ? value.mcqs : null;
  const longForm = Array.isArray(value.longForm) ? value.longForm : null;

  if (mcqs || longForm) {
    return {
      mcqs: mcqs ?? [],
      longForm: longForm ?? [],
      metadata: isRecord(value.metadata) ? value.metadata : undefined,
    };
  }

  for (const key of ["exam", "structuredExam", "examData", "data", "payload"]) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const {
      mode = "exam_simulation",
      topic = "Computer Networks - General",
      numMultipleChoice = 10,
      numOpenEnded = 5,
      difficulty = "medium",
      includeTopics = [],
      excludeTopics = [],
      sessionId = `exam-${Date.now()}`,
    } = requestBody;

    const webhookUrl = Deno.env.get("N8N_EXAM_GENERATOR_URL") || DEFAULT_WEBHOOK_URL;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          topic,
          numMultipleChoice,
          numOpenEnded,
          difficulty,
          includeTopics,
          excludeTopics,
          sessionId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        throw new Error(`n8n returned status ${webhookResponse.status}`);
      }

      const result = await parseJsonResponse(webhookResponse);
      const structured = extractStructuredPayload(result);
      const pdf = normalizePdfArtifacts(result);

      if (!structured && !pdf.link) {
        console.error("[generate-exam] n8n returned neither structured exam data nor a PDF link:", result);
        throw new Error("n8n returned neither structured exam data nor a PDF link.");
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          sessionId:
            (isRecord(result) && typeof result.sessionId === "string" && result.sessionId) ||
            sessionId,
          pdf,
          exam: structured,
          raw: result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("Exam generation timed out after 120 seconds.");
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("[generate-exam] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: "Failed to generate mock exam.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
