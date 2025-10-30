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
      includeTopics = [],
      excludeTopics = [],
    } = await req.json();

    const sessionId = `exam-${Date.now()}`;

    console.log("Request params:", { topic, numMultipleChoice, numOpenEnded, difficulty, includeTopics, excludeTopics, sessionId });

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
          includeTopics,
          excludeTopics,
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

      // Parse JSON response containing Google Drive link
      const result = await webhookResponse.json();
      console.log("n8n response:", result);

      // Extract and validate fields with fallbacks
      let fileId = result.fileId || result.id;
      let link = result.link || result.webViewLink;
      let downloadLink = result.downloadLink || result.webContentLink;

      // Extract fileId from link if not provided
      if (!fileId && link) {
        const fileIdMatch = link.match(/\/d\/([^\/]+)/);
        if (fileIdMatch) fileId = fileIdMatch[1];
      }

      // Build links from fileId if missing
      if (fileId && (!link || link.startsWith("={{"))) {
        link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      }
      if (fileId && (!downloadLink || downloadLink.startsWith("={{"))) {
        downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      // Final validation - throw error if link is still invalid
      if (!link || link.startsWith("={{")) {
        console.error("Invalid link returned from n8n:", result);
        throw new Error('n8n returned invalid or unevaluated template string. Check "Make File Public" node configuration.');
      }

      // Return the Google Drive link as JSON
      return new Response(
        JSON.stringify({ 
          link,
          downloadLink: downloadLink || null,
          fileId: fileId || null,
          success: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
