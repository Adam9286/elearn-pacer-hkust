import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External Supabase connection (oqgotlmztpvchkipslnc - MockExam & Knowledge Base)
const EXAM_SUPABASE_URL = "https://oqgotlmztpvchkipslnc.supabase.co";
const EXAM_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZ290bG16dHB2Y2hraXBzbG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMjc0MjAsImV4cCI6MjA3NTkwMzQyMH0.1yt8V-9weq5n7z2ncN1p9vAgRvNI4TAIC5VyDFcuM7w";

// Lovable AI Gateway
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface SlideContent {
  slide_number: number;
  slide_text: string;
}

interface GeneratedContent {
  explanation: string;
  keyPoints: string[];
  comprehensionQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

async function generateSlideExplanation(
  lectureId: string,
  slideNumber: number,
  slideText: string,
  totalSlides: number,
  apiKey: string
): Promise<GeneratedContent> {
  const systemPrompt = `You are an expert computer networks instructor for ELEC3120 at HKUST. 
Your role is to explain lecture slides clearly and engagingly to undergraduate students.
Always provide accurate, educational content that helps students understand networking concepts.`;

  const userPrompt = `Generate an explanation for this lecture slide.

Lecture: ${lectureId}
Slide ${slideNumber} of ${totalSlides}

Slide Content:
${slideText}

Return a JSON object with:
1. "explanation": A clear, engaging 2-4 paragraph explanation of this slide's content
2. "keyPoints": An array of 3-5 key takeaways (strings)
3. "comprehensionQuestion": An object with:
   - "question": A multiple-choice question testing understanding
   - "options": Array of exactly 4 answer choices
   - "correctIndex": Index (0-3) of the correct answer
   - "explanation": Why the correct answer is right

Respond ONLY with valid JSON, no markdown or extra text.`;

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr) as GeneratedContent;
  } catch (parseError) {
    console.error("Failed to parse AI response:", jsonStr);
    throw new Error("Invalid JSON in AI response");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lecture_id, force_regenerate = false, slide_range } = await req.json();

    if (!lecture_id) {
      return new Response(
        JSON.stringify({ error: "lecture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to external Supabase
    const examSupabase = createClient(EXAM_SUPABASE_URL, EXAM_SUPABASE_ANON_KEY);

    console.log(`[batch-generate-slides] Starting for lecture: ${lecture_id}`);

    // Fetch all slides for this lecture from lecture_slides_course
    let query = examSupabase
      .from("lecture_slides_course")
      .select("slide_number, slide_text")
      .eq("lecture_id", lecture_id)
      .order("slide_number", { ascending: true });

    // Optional: limit to specific slide range
    if (slide_range) {
      const [start, end] = slide_range;
      query = query.gte("slide_number", start).lte("slide_number", end);
    }

    const { data: slides, error: slidesError } = await query;

    if (slidesError) {
      console.error("Error fetching slides:", slidesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch slides", details: slidesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ error: "No slides found for lecture", lecture_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch-generate-slides] Found ${slides.length} slides`);

    // Check which slides already have explanations
    const { data: existingExplanations } = await examSupabase
      .from("slide_explanations")
      .select("slide_number")
      .eq("lecture_id", lecture_id);

    const existingSlideNumbers = new Set(
      existingExplanations?.map((e) => e.slide_number) || []
    );

    const results = {
      lecture_id,
      total_slides: slides.length,
      generated: 0,
      skipped: 0,
      errors: [] as { slide_number: number; error: string }[],
    };

    // Process each slide
    for (const slide of slides as SlideContent[]) {
      // Skip if already exists and not force regenerating
      if (existingSlideNumbers.has(slide.slide_number) && !force_regenerate) {
        console.log(`[batch-generate-slides] Skipping slide ${slide.slide_number} (already exists)`);
        results.skipped++;
        continue;
      }

      try {
        console.log(`[batch-generate-slides] Generating slide ${slide.slide_number}...`);

        const generated = await generateSlideExplanation(
          lecture_id,
          slide.slide_number,
          slide.slide_text,
          slides.length,
          LOVABLE_API_KEY
        );

        // Upsert to slide_explanations with status = 'draft'
        const { error: upsertError } = await examSupabase
          .from("slide_explanations")
          .upsert(
            {
              lecture_id,
              slide_number: slide.slide_number,
              explanation: generated.explanation,
              key_points: generated.keyPoints,
              comprehension_question: generated.comprehensionQuestion || null,
              status: "draft",
            },
            { onConflict: "lecture_id,slide_number" }
          );

        if (upsertError) {
          console.error(`Error upserting slide ${slide.slide_number}:`, upsertError);
          results.errors.push({
            slide_number: slide.slide_number,
            error: upsertError.message,
          });
        } else {
          results.generated++;
          console.log(`[batch-generate-slides] Slide ${slide.slide_number} saved as draft`);
        }

        // Rate limiting: wait 1.5 seconds between API calls
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Error generating slide ${slide.slide_number}:`, err);
        results.errors.push({
          slide_number: slide.slide_number,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    console.log(`[batch-generate-slides] Completed:`, results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("batch-generate-slides error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
