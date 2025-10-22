import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generate exam function called");

    const {
      topic = "Computer Networks - General",
      numMultipleChoice = 10,
      numOpenEnded = 5,
      difficulty = "medium",
    } = await req.json();

    const sessionId = `exam-${Date.now()}`;

    console.log("Request params:", { topic, numMultipleChoice, numOpenEnded, difficulty, sessionId });

    // Call the n8n webhook with timeout
    const webhookUrl = "https://smellycat9286.app.n8n.cloud/webhook-test/exam-generator";

    // Create AbortController for timeout (120 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      console.log("Calling n8n webhook...");
      const startTime = Date.now();

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          numMultipleChoice,
          numOpenEnded,
          difficulty,
          sessionId,
        }),
        signal: controller.signal,
      });

      const endTime = Date.now();
      console.log(`n8n response time: ${endTime - startTime}ms`);

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        console.error("Webhook error:", webhookResponse.status, webhookResponse.statusText);
        throw new Error(`Webhook returned status ${webhookResponse.status}`);
      }

      const contentType = webhookResponse.headers.get("content-type") || "";

      // Check if response is a PDF
      if (contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) {
        console.log("Received PDF response, forwarding to client...");

        // Get PDF blob
        const pdfBlob = await webhookResponse.blob();
        console.log("PDF size:", pdfBlob.size, "bytes");

        // Return PDF with proper headers
        return new Response(pdfBlob, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="mock-exam-${Date.now()}.pdf"`,
          },
        });
      }

      // If not PDF, throw error
      const text = await webhookResponse.text();
      console.error("Unexpected response format. Content-Type:", contentType);
      console.error("Response preview:", text.substring(0, 200));
      throw new Error("Expected PDF response from webhook, but received: " + contentType);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("Request timeout after 120 seconds");
        throw new Error("PDF generation timed out. Please try again.");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error in generate-exam function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: "Failed to generate exam PDF. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
