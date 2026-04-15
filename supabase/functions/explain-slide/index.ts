import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// External Supabase connection (examSupabase — Knowledge Base)
const EXAM_SUPABASE_URL = "https://oqgotlmztpvchkipslnc.supabase.co";
const EXAM_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZ290bG16dHB2Y2hraXBzbG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMjc0MjAsImV4cCI6MjA3NTkwMzQyMH0.1yt8V-9weq5n7z2ncN1p9vAgRvNI4TAIC5VyDFcuM7w";

interface SlideRequest {
  lessonId: string;
  lectureId?: string;       // e.g., "02-Web" — resolved by frontend
  slideNumber: number;
  totalSlides: number;
  lessonTitle: string;
  chapterTitle: string;
  chapterTopics: string[];
  textbookSections?: string;
  previousContext?: string;
  generateQuestion: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const {
      lessonId,
      lectureId,
      slideNumber,
      totalSlides,
      lessonTitle,
      chapterTitle,
      chapterTopics,
      textbookSections,
      previousContext,
      generateQuestion
    }: SlideRequest = await req.json();

    console.log(`[explain-slide] Generating for slide ${slideNumber}/${totalSlides}, lecture: ${lectureId || lessonId}`);

    // -------------------------------------------------------------------
    // Query lecture_slides_course for real slide content
    // -------------------------------------------------------------------
    let slideText = "";
    let lectureOutline = "";
    let actualTotalSlides = totalSlides;

    if (lectureId) {
      const examSupabase = createClient(EXAM_SUPABASE_URL, EXAM_SUPABASE_ANON_KEY);

      const { data: allSlides, error: slidesError } = await examSupabase
        .from("lecture_slides_course")
        .select("slide_number, content")
        .eq("lecture_id", lectureId)
        .order("slide_number", { ascending: true });

      if (!slidesError && allSlides && allSlides.length > 0) {
        actualTotalSlides = allSlides.length;

        const target = allSlides.find(s => s.slide_number === slideNumber);
        if (target) {
          slideText = target.content || "";
        }

        // Build lecture outline for context (first 100 chars per slide)
        lectureOutline = allSlides
          .map(s => `Slide ${s.slide_number}: ${(s.content || "").slice(0, 100)}${(s.content || "").length > 100 ? '...' : ''}`)
          .join('\n');

        console.log(`[explain-slide] Found slide text: ${slideText.length} chars, lecture has ${allSlides.length} slides`);
      } else {
        console.log(`[explain-slide] No slide data for lectureId=${lectureId}, falling back to metadata`);
      }
    }

    // -------------------------------------------------------------------
    // Build prompts
    // -------------------------------------------------------------------
    const hasSlideContent = slideText.length > 10;
    const isFirstSlide = slideNumber === 1;

    const systemPrompt = `You are an expert computer networks tutor for the ELEC3120 course at HKUST.
Your role is to explain lecture slide content clearly and accurately to undergraduate students.

RULES:
1. ${hasSlideContent ? "ONLY explain what is on the provided slide content. Do not add external information not present on the slide." : "Explain the expected content for this slide position based on the lecture topic."}
2. Do NOT start with greetings like "Welcome!", "Hello!", etc.
3. ${isFirstSlide ? "You may include a brief introduction to the lecture topic." : "Dive directly into the content without preamble."}
4. Use the exact terminology from the slides when available.
5. Be conversational but technically accurate.
6. Use analogies to explain complex concepts.
7. Keep explanations focused and digestible (2-3 paragraphs max).
8. Connect concepts to what was covered in previous slides when relevant.

Course context:
- Chapter: ${chapterTitle}
- Lesson: ${lessonTitle}
- Topics covered: ${chapterTopics.join(', ')}
${textbookSections ? `- Textbook sections: ${textbookSections}` : ''}
${previousContext ? `\nPrevious slides context: ${previousContext}` : ''}`;

    let userPrompt: string;

    if (hasSlideContent) {
      userPrompt = `Explain this lecture slide.

SLIDE ${slideNumber} of ${actualTotalSlides}

${lectureOutline ? `LECTURE OUTLINE:\n${lectureOutline}\n` : ''}
SLIDE CONTENT:
${slideText}

Explain what this slide teaches based on its content.`;
    } else {
      userPrompt = `Explain slide ${slideNumber} of ${totalSlides} for the lecture "${lessonTitle}".
Note: Slide text is not available. Generate a plausible explanation based on the lecture topic and slide position.`;
    }

    // Append JSON format instructions
    if (generateQuestion) {
      userPrompt += `\n\nRespond in JSON:
{
  "explanation": "2-3 paragraph explanation",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "comprehensionQuestion": {
    "question": "A multiple-choice question testing understanding",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Why the correct answer is right"
  }
}`;
    } else {
      userPrompt += `\n\nRespond in JSON:
{
  "explanation": "2-3 paragraph explanation",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`;
    }

    // -------------------------------------------------------------------
    // Call Gemini API
    // -------------------------------------------------------------------
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Gemini API key is invalid or lacks permissions.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', content);
      parsed = {
        explanation: content,
        keyPoints: ['Key concept from this slide'],
      };
    }

    console.log(`[explain-slide] Success (content-grounded: ${hasSlideContent})`);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in explain-slide:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
