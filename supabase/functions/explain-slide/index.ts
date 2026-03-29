import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideRequest {
  lessonId: string;
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Add it to Supabase Edge Function secrets.');
    }

    const {
      lessonId,
      slideNumber,
      totalSlides,
      lessonTitle,
      chapterTitle,
      chapterTopics,
      textbookSections,
      previousContext,
      generateQuestion
    }: SlideRequest = await req.json();

    console.log(`Generating explanation for slide ${slideNumber}/${totalSlides} of lesson: ${lessonTitle}`);

    const systemPrompt = `You are an expert computer networks tutor for the ELEC3120 course at HKUST. Your role is to explain lecture slides in an engaging, clear, and educational manner.

Course context:
- Chapter: ${chapterTitle}
- Lesson: ${lessonTitle}
- Topics covered: ${chapterTopics.join(', ')}
${textbookSections ? `- Textbook sections: ${textbookSections}` : ''}

Your teaching style:
- Be conversational but technically accurate
- Use analogies to explain complex concepts
- Break down technical terms
- Connect concepts to real-world applications
- Keep explanations focused and digestible (2-3 paragraphs max)

${previousContext ? `Previous slides context: ${previousContext}` : ''}`;

    const userPrompt = generateQuestion
      ? `Explain slide ${slideNumber} of ${totalSlides} for the lecture "${lessonTitle}".

Since this is a comprehension checkpoint, also generate a multiple-choice question to test understanding.

Respond in JSON format:
{
  "explanation": "Your 2-3 paragraph explanation of the slide content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "comprehensionQuestion": {
    "question": "Your question testing slide comprehension",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why the correct answer is right"
  }
}`
      : `Explain slide ${slideNumber} of ${totalSlides} for the lecture "${lessonTitle}".

Respond in JSON format:
{
  "explanation": "Your 2-3 paragraph explanation of the slide content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`;

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            { role: 'user', parts: [{ text: userPrompt }] }
          ],
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
          JSON.stringify({ error: 'Gemini API key is invalid or lacks permissions. Check your API key configuration.' }),
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

    // Parse the JSON response
    let parsed;
    try {
      // With responseMimeType: 'application/json', Gemini should return clean JSON
      // But handle markdown code blocks as fallback
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', content);
      // Fallback: treat as plain explanation
      parsed = {
        explanation: content,
        keyPoints: ['Key concept from this slide'],
      };
    }

    console.log('Successfully generated slide explanation');

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in explain-slide function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
